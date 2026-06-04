import { OpenAI } from "openai";
import type { FunctionTool, ResponseFunctionToolCall } from "openai/resources/responses/responses.mjs";
import { createDefaultTools } from "./tools";
import { handleToolCall, type ToolMap, type ToolOutput, toolDefinitions } from "./tools/registry";
import { isToolCall } from "./utils";

const DEFAULT_MODEL = "gpt-5.4-mini";
const DEFAULT_MAX_TOOL_TURNS = 8;

export type Agent = {
  client: OpenAI;
  model: string;
  tools: ToolMap;
  toolDefinitions: FunctionTool[];
  maxToolTurns: number;
  previousResponseId?: string;
};

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

export function createAgent(options: AgentOptions = {}): Agent {
  const workspaceRoot = options.workspaceRoot ?? process.cwd();
  const tools = createDefaultTools(workspaceRoot);

  return {
    client: options.client ?? new OpenAI(),
    model: options.model ?? process.env.OPENAI_MODEL ?? DEFAULT_MODEL,
    tools,
    toolDefinitions: toolDefinitions(tools),
    maxToolTurns: options.maxToolTurns ?? DEFAULT_MAX_TOOL_TURNS,
  };
}

export async function runOneUserTurn(agent: Agent, userInput: string): Promise<string> {
  let turnInput: TurnInput = [{ role: "user", content: userInput }];

  for (let turn = 0; turn < agent.maxToolTurns; ++turn) {
    const response = await agent.client.responses.create({
      model: agent.model,
      input: turnInput,
      tools: agent.toolDefinitions,
      previous_response_id: agent.previousResponseId,
    });

    agent.previousResponseId = response.id;

    const toolCalls = response.output.filter(isToolCall);
    if (toolCalls.length === 0) {
      return response.output_text;
    }

    turnInput = await runToolCalls(agent.tools, toolCalls);
  }

  throw new Error(`Exceeded max tool turns ${agent.maxToolTurns}`);
}

export async function runToolCalls(tools: ToolMap, toolCalls: ResponseFunctionToolCall[]): Promise<ToolOutput[]> {
  const toolOutputs: ToolOutput[] = [];

  for (const toolCall of toolCalls) {
    toolOutputs.push(await handleToolCall(tools, toolCall));
  }

  return toolOutputs;
}
