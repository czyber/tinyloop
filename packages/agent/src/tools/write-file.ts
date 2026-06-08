import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { createTwoFilesPatch } from "diff";
import type { ToolHandler, ToolResult } from "./registry";

import { requiredStringArg, resolveWorkspacePath } from "./registry";

export type WriteFileToolDetails = {
  path: string;
  content: string;
};

async function writeFileTool(
  workspaceRoot: string,
  path: string,
  content: string,
): Promise<ToolResult<WriteFileToolDetails>> {
  const filePath = resolveWorkspacePath(workspaceRoot, path);
  await mkdir(dirname(filePath), { recursive: true });

  let before: string | undefined;
  try {
    before = await readFile(filePath, "utf-8");
  } catch (error) {
    if (!isFileNotFoundError(error)) {
      throw error;
    }
  }

  await writeFile(filePath, content, "utf-8");

  if (before === undefined) {
    return { output: `Created ${filePath}`, details: { path, content } };
  }

  return {
    output: createTwoFilesPatch(filePath, filePath, before, content, "before", "after"),
    details: { path, content },
  };
}

function isFileNotFoundError(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}

export function createWriteFileTool(workspaceRoot: string): ToolHandler {
  return {
    definition: {
      type: "function",
      name: "write_file",
      description: "Create or overwrite a file.",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "The path of the file to write.",
          },
          content: {
            type: "string",
            description: "The complete file contents to write.",
          },
        },
        required: ["path", "content"],
        additionalProperties: false,
      },
      strict: true,
    },
    run: async (input) => {
      const path = requiredStringArg(input, "path");
      const content = requiredStringArg(input, "content");
      return await writeFileTool(workspaceRoot, path, content);
    },
  };
}
