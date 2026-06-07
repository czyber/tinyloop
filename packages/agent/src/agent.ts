import { OpenAI } from "openai";
import type { FunctionTool, ResponseFunctionToolCall } from "openai/resources/responses/responses.mjs";
import { createDefaultTools } from "./tools";
import { handleToolCall, type ToolMap, type ToolOutput, toolDefinitions } from "./tools/registry";
import { isToolCall } from "./utils";
import { AgentEventSink } from "./event";

const DEFAULT_MODEL = "gpt-5.4-mini";
const DEFAULT_MAX_TOOL_TURNS = 8;

export class Agent {
  private client: OpenAI;
  private model: string;
  private tools: ToolMap;
  private toolDefinitions: FunctionTool[];
  private maxToolTurns: number;
  private previousResponseId: string | undefined;

  constructor(options: AgentOptions = {}) {
    const workspaceRoot = options.workspaceRoot ?? process.cwd();
    const tools = createDefaultTools(workspaceRoot);

    this.client = options.client ?? new OpenAI();
    this.model = options.model ?? process.env.OPENAI_MODEL ?? DEFAULT_MODEL;
    this.tools = tools;
    this.toolDefinitions = toolDefinitions(tools);
    this.maxToolTurns = options.maxToolTurns ?? DEFAULT_MAX_TOOL_TURNS;
    this.previousResponseId = undefined;
  }

  async runOneUserTurn(userInput: string, options?: {emit: AgentEventSink}): Promise<string> {
    let turnInput: TurnInput = [{ role: "user", content: userInput }];

    for (let turn = 0; turn < this.maxToolTurns; ++turn) {
      const response = await this.client.responses.create({
        model: this.model,
        input: turnInput,
        tools: this.toolDefinitions,
        previous_response_id: this.previousResponseId,
      });

      this.previousResponseId = response.id;

      const toolCalls = response.output.filter(isToolCall);
      if (toolCalls.length === 0) {
        return response.output_text;
      }

      turnInput = await runToolCalls(this.tools, toolCalls, options);
    }

    throw new Error(`Exceeded max tool turns ${this.maxToolTurns}`);
  }
}

export type AgentOptions = {
  client?: OpenAI;
  workspaceRoot?: string;
  model?: string;
  maxToolTurns?: number;
};

type UserInput = {
  role: "user";
  content: string;
};

type TurnInput = Array<UserInput | ToolOutput>;

export async function runToolCalls(tools: ToolMap, toolCalls: ResponseFunctionToolCall[], options? : {emit: AgentEventSink}): Promise<ToolOutput[]> {
  const toolOutputs: ToolOutput[] = [];

  for (const toolCall of toolCalls) {
    options?.emit({type: "tool.execution.started", name: toolCall.name});
    toolOutputs.push(await handleToolCall(tools, toolCall));
  }

  return toolOutputs;
}
