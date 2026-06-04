import { readFile } from "node:fs/promises";
import type { ToolHandler } from "./registry";
import { requiredStringArg, resolveWorkspacePath } from "./registry";

async function readFileTool(workspaceRoot: string, path: string): Promise<string> {
  const filePath = resolveWorkspacePath(workspaceRoot, path);
  return await readFile(filePath, "utf-8");
}

export function createReadFileTool(workspaceRoot: string): ToolHandler {
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
    run: async (input) => {
      const path = requiredStringArg(input, "path");
      return await readFileTool(workspaceRoot, path);
    },
  };
}
