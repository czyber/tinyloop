import { readFile, writeFile } from "node:fs/promises";
import { createTwoFilesPatch } from "diff";
import type { ToolHandler } from "./registry";
import { requiredStringArg, resolveWorkspacePath } from "./registry";

function countOccurrences(text: string, search: string): number {
  if (search.length === 0) {
    return 0;
  }

  return text.split(search).length - 1;
}

async function editFileTool(
  workspaceRoot: string,
  path: string,
  oldSnippet: string,
  newSnippet: string,
): Promise<string> {
  if (oldSnippet.length === 0) {
    throw new Error("oldSnippet must not be empty.");
  }

  const filePath = resolveWorkspacePath(workspaceRoot, path);
  const before = await readFile(filePath, "utf-8");
  const occurrences = countOccurrences(before, oldSnippet);

  if (occurrences === 0) {
    throw new Error(`Snippet to be replaced not found in ${filePath}`);
  }

  if (occurrences > 1) {
    throw new Error(
      `Multiple occurrences of the snippet to be replaced were found in ${filePath}. Choose a more specific snippet.`,
    );
  }

  const after = before.replace(oldSnippet, newSnippet);
  const diff = createTwoFilesPatch(filePath, filePath, before, after, "before", "after");
  await writeFile(filePath, after, "utf-8");
  return diff;
}

export function createEditFileTool(workspaceRoot: string): ToolHandler {
  return {
    definition: {
      type: "function",
      name: "edit_file",
      description: "Edit the contents of a file.",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "The path of the file to edit.",
          },
          oldSnippet: {
            type: "string",
            description: "The snippet that should be replaced.",
          },
          newSnippet: {
            type: "string",
            description: "The content of the new snippet. For deletion pass an empty string.",
          },
        },
        required: ["path", "oldSnippet", "newSnippet"],
        additionalProperties: false,
      },
      strict: true,
    },
    run: async (input) => {
      const path = requiredStringArg(input, "path");
      const oldSnippet = requiredStringArg(input, "oldSnippet");
      const newSnippet = requiredStringArg(input, "newSnippet");
      return await editFileTool(workspaceRoot, path, oldSnippet, newSnippet);
    },
  };
}
