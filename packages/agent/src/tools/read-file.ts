import { readFile } from "node:fs/promises";
import type { ToolHandler, ToolResult, ToolRunContext } from "./registry";
import { requiredStringArg, resolveWorkspacePath } from "./registry";

export type ReadFileToolDetails = {
  path: string;
};

async function readFileTool(
  workspaceRoot: string,
  path: string,
  _context: ToolRunContext,
): Promise<ToolResult<ReadFileToolDetails>> {
  const filePath = resolveWorkspacePath(workspaceRoot, path);
  const result = await readFile(filePath, "utf-8");
  return {
    output: result,
    details: {
      path,
    },
  };
}

export function createReadFileTool(workspaceRoot: string): ToolHandler<ReadFileToolDetails> {
  return {
    definition: {
      type: "function",
      name: "read_file",
      description: "Read the contents of a file.",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "The path of the file to read.",
          },
        },
        required: ["path"],
        additionalProperties: false,
      },
      strict: true,
    },
    run: async (input, context: ToolRunContext) => {
      const path = requiredStringArg(input, "path");
      return await readFileTool(workspaceRoot, path, context);
    },
  };
}
