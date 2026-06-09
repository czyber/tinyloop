import { isAbsolute, relative, resolve } from "node:path";
import type { FunctionTool, ResponseFunctionToolCall } from "openai/resources/responses/responses.mjs";
import type { AgentEventSink } from "../event";
import type { EditFileToolDetails } from "./edit-file";
import type { ReadFileToolDetails } from "./read-file";
import type { RunCommandLineToolDetails } from "./run-command";
import type { WriteFileToolDetails } from "./write-file";

export type ToolArgs = Record<string, unknown>;

export type ToolResult<TDetails = unknown> = {
  output: string;
  details?: TDetails;
};

export type ToolRunContext = {
  name: string;
  callId: string;
  emit: AgentEventSink;
};

export type ToolHandler<TDetails = unknown> = {
  definition: FunctionTool;
  run: (args: ToolArgs, context: ToolRunContext) => ToolResult<TDetails> | Promise<ToolResult<TDetails>>;
};

export type ToolMap = Record<string, ToolHandler>;
export type ToolNameOf<TTools extends ToolMap> = Extract<keyof TTools, string>;
export type ToolDetailsOf<TTool> = TTool extends ToolHandler<infer TDetails> ? TDetails : never;
export type ToolDetailsFor<TTools extends ToolMap, TName extends ToolNameOf<TTools>> = ToolDetailsOf<TTools[TName]>;

export type ToolOutput = {
  type: "function_call_output";
  call_id: string;
  output: string;
};

export type ToolExecutionOutput<TName extends string = string, TDetails = unknown> = {
  name: TName;
  output: ToolOutput;
  result: ToolResult<TDetails>;
};

export type ToolExecutionOutputFor<TTools extends ToolMap, TName extends ToolNameOf<TTools> = ToolNameOf<TTools>> = {
  [Name in TName]: ToolExecutionOutput<Name, ToolDetailsFor<TTools, Name>>;
}[TName];

export function resolveWorkspacePath(workspaceRoot: string, path: string): string {
  const resolvedRoot = resolve(workspaceRoot);
  const resolvedPath = resolve(resolvedRoot, path);
  const relativePath = relative(resolvedRoot, resolvedPath);

  if (relativePath.startsWith("..") || isAbsolute(relativePath)) {
    throw new Error(`Path escapes workspace ${path}`);
  }

  return resolvedPath;
}

export function requiredStringArg(args: ToolArgs, name: string): string {
  const value = args[name];
  if (typeof value !== "string") {
    throw new Error(`Expected string argument "${name}".`);
  }

  return value;
}

export function toolDefinitions<TTools extends ToolMap>(tools: TTools): FunctionTool[] {
  return Object.values(tools).map((tool) => tool.definition);
}

export type ToolDetailsByName = {
  read_file: ReadFileToolDetails;
  write_file: WriteFileToolDetails;
  edit_file: EditFileToolDetails;
  run_command: RunCommandLineToolDetails;
};

export type ToolName = keyof ToolDetailsByName;

export async function handleToolCall<TTools extends ToolMap, TName extends ToolNameOf<TTools>>(
  tools: TTools,
  toolCall: ResponseFunctionToolCall & { name: TName },
  options: { emit: AgentEventSink },
): Promise<ToolExecutionOutputFor<TTools, TName>> {
  const tool = tools[toolCall.name];
  if (!tool) {
    throw new Error(`Invalid tool call: ${toolCall.name}`);
  }
  const context: ToolRunContext = { name: toolCall.name, callId: toolCall.call_id, emit: options.emit };
  const args = parseToolArgs(toolCall.arguments);
  const result = await tool.run(args, context);
  return {
    name: toolCall.name,
    output: {
      type: "function_call_output",
      call_id: toolCall.call_id,
      output: result.output,
    },
    result,
  } as ToolExecutionOutputFor<TTools, TName>;
}

function parseToolArgs(rawArgs: string): ToolArgs {
  const args = JSON.parse(rawArgs);
  if (args === null || typeof args !== "object" || Array.isArray(args)) {
    throw new Error("Tool arguments must be a JSON object.");
  }

  return args as ToolArgs;
}
