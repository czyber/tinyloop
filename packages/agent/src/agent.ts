import { OpenAI } from "openai";
import type {
  FunctionTool,
  Response,
  ResponseFunctionToolCall,
  ResponseInputItem,
  ResponseOutputItem,
  ResponseStreamEvent,
} from "openai/resources/responses/responses.mjs";
import type { AgentEventSink, ToolFinishedEvent } from "./event";
import { createDefaultTools } from "./tools";
import type { EditFileToolDetails } from "./tools/edit-file";
import type { ReadFileToolDetails } from "./tools/read-file";
import { handleToolCall, type ToolMap, type ToolOutput, toolDefinitions } from "./tools/registry";
import type { RunCommandLineToolDetails } from "./tools/run-command";
import type { WriteFileToolDetails } from "./tools/write-file";
import { isToolCall } from "./utils";

const DEFAULT_MODEL = "gpt-5.4-mini";
const DEFAULT_MAX_TOOL_TURNS = 8;

function toToolFinishedEvent(name: string, callId: string, output: string, details: unknown): ToolFinishedEvent {
  const eventType = "tool.execution.finished";
  switch (name) {
    case "read_file":
      return {
        type: eventType,
        name,
        callId,
        output,
        details: details as ReadFileToolDetails,
      };

    case "write_file":
      return {
        type: eventType,
        name,
        callId,
        output,
        details: details as WriteFileToolDetails,
      };

    case "edit_file":
      return {
        type: eventType,
        name,
        callId,
        output,
        details: details as EditFileToolDetails,
      };

    case "run_command":
      return {
        type: eventType,
        name,
        callId,
        output,
        details: details as RunCommandLineToolDetails,
      };

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

export class Agent {
  private client: OpenAI;
  private model: string;
  private tools: ToolMap;
  private toolDefinitions: FunctionTool[];
  private maxToolTurns: number;
  private previousResponseId: string | undefined;
  private conversationItems: ResponseInputItem[];
  private streamResponses: boolean;
  private storeResponses: boolean | undefined;
  private usePreviousResponseId: boolean;

  constructor(options: AgentOptions = {}) {
    const workspaceRoot = options.workspaceRoot ?? process.cwd();
    const tools = createDefaultTools(workspaceRoot);

    this.client =
      options.client ??
      new OpenAI({
        apiKey: options.apiKey,
        baseURL: options.baseURL,
        defaultHeaders: options.defaultHeaders,
      });
    this.model = options.model ?? process.env.OPENAI_MODEL ?? DEFAULT_MODEL;
    this.tools = tools;
    this.toolDefinitions = toolDefinitions(tools);
    this.maxToolTurns = options.maxToolTurns ?? DEFAULT_MAX_TOOL_TURNS;
    this.previousResponseId = undefined;
    this.conversationItems = [];
    this.streamResponses = options.streamResponses ?? false;
    this.storeResponses = options.storeResponses;
    this.usePreviousResponseId = options.usePreviousResponseId ?? options.storeResponses !== false;
  }

  async runOneUserTurn(userInput: string, options: { emit: AgentEventSink }): Promise<string> {
    const userInputItem: UserInput = { role: "user", content: userInput };
    const turnItems: ResponseInputItem[] = [userInputItem];
    let turnInput: TurnInput = this.usePreviousResponseId ? [userInputItem] : [...this.conversationItems, ...turnItems];

    for (let turn = 0; turn < this.maxToolTurns; ++turn) {
      const response = await this.createResponse(turnInput);
      if (this.usePreviousResponseId) {
        this.previousResponseId = response.id;
      } else {
        turnItems.push(...responseOutputAsInput(response.output));
      }

      const toolCalls = response.output.filter(isToolCall);
      if (toolCalls.length === 0) {
        if (!this.usePreviousResponseId) {
          this.conversationItems.push(...turnItems);
        }
        return response.output_text;
      }

      const toolOutputs = await runToolCalls(this.tools, toolCalls, options);
      turnInput = toolOutputs;
      if (!this.usePreviousResponseId) {
        turnItems.push(...toolOutputs);
        turnInput = [...this.conversationItems, ...turnItems];
      }
    }

    throw new Error(`Exceeded max tool turns ${this.maxToolTurns}`);
  }

  private async createResponse(input: TurnInput): Promise<Response> {
    const request = {
      model: this.model,
      input,
      tools: this.toolDefinitions,
      previous_response_id: this.usePreviousResponseId ? this.previousResponseId : undefined,
      store: this.storeResponses,
    };

    if (this.streamResponses) {
      return collectResponseStream(this.client.responses.stream(request));
    }

    return this.client.responses.create(request);
  }
}

export type AgentOptions = {
  client?: OpenAI;
  apiKey?: string;
  baseURL?: string;
  defaultHeaders?: Record<string, string>;
  workspaceRoot?: string;
  model?: string;
  maxToolTurns?: number;
  streamResponses?: boolean;
  storeResponses?: boolean;
  usePreviousResponseId?: boolean;
};

type UserInput = {
  role: "user";
  content: string;
};

type TurnInput = ResponseInputItem[];

async function collectResponseStream(stream: AsyncIterable<ResponseStreamEvent>): Promise<Response> {
  let completedResponse: Response | undefined;
  const outputItems: ResponseOutputItem[] = [];

  for await (const event of stream) {
    switch (event.type) {
      case "response.output_item.done":
        outputItems[event.output_index] = event.item;
        break;

      case "response.completed":
        completedResponse = event.response;
        break;

      case "response.failed":
        throw new Error(event.response.error?.message ?? "Response failed.");

      case "error":
        throw new Error(event.message);
    }
  }

  if (!completedResponse) {
    throw new Error("Response stream ended before completion.");
  }

  const output =
    outputItems.length > 0
      ? outputItems.filter((item): item is ResponseOutputItem => Boolean(item))
      : completedResponse.output;

  return {
    ...completedResponse,
    output,
    output_text: completedResponse.output_text || outputText(output),
  };
}

function responseOutputAsInput(output: ResponseOutputItem[]): ResponseInputItem[] {
  return output as ResponseInputItem[];
}

function outputText(output: ResponseOutputItem[]): string {
  return output
    .flatMap((item) => (item.type === "message" ? item.content : []))
    .filter((content) => content.type === "output_text")
    .map((content) => content.text)
    .join("");
}

export async function runToolCalls(
  tools: ToolMap,
  toolCalls: ResponseFunctionToolCall[],
  options: { emit: AgentEventSink },
): Promise<ToolOutput[]> {
  const toolOutputs: ToolOutput[] = [];

  for (const toolCall of toolCalls) {
    options?.emit({
      type: "tool.execution.started",
      name: toolCall.name,
      callId: toolCall.call_id,
      args: toolCall.arguments,
    });
    const execution = await handleToolCall(tools, toolCall, options);
    toolOutputs.push(execution.output);
    options?.emit(
      toToolFinishedEvent(toolCall.name, toolCall.call_id, execution.result.output, execution.result.details),
    );
  }

  return toolOutputs;
}
