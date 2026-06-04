import { isAbsolute, relative, resolve } from "node:path";
import type { FunctionTool, ResponseFunctionToolCall } from "openai/resources/responses/responses.mjs";

export type ToolHandler = {
  definition: FunctionTool;
  run: (args: ToolArgs) => string | Promise<string>;
};

export type ToolArgs = Record<string, unknown>;
export type ToolMap = Record<string, ToolHandler>;

export type ToolOutput = {
  type: "function_call_output";
  call_id: string;
  output: string;
};

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

export function toolDefinitions(tools: ToolMap): FunctionTool[] {
  return Object.values(tools).map((tool) => tool.definition);
}

export async function handleToolCall(tools: ToolMap, toolCall: ResponseFunctionToolCall): Promise<ToolOutput> {
  const tool = tools[toolCall.name];
  if (!tool) {
    throw new Error(`Invalid tool call: ${toolCall.name}`);
  }

  const args = parseToolArgs(toolCall.arguments);
  const output = await tool.run(args);
  return {
    type: "function_call_output",
    call_id: toolCall.call_id,
    output,
  };
}

function parseToolArgs(rawArgs: string): ToolArgs {
  const args = JSON.parse(rawArgs);
  if (args === null || typeof args !== "object" || Array.isArray(args)) {
    throw new Error("Tool arguments must be a JSON object.");
  }

  return args as ToolArgs;
}
