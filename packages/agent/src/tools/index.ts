import { createEditFileTool } from "./edit-file";
import { createReadFileTool } from "./read-file";
import type { ToolMap } from "./registry";
import { createRunCommandTool } from "./run-command";
import { createWriteFileTool } from "./write-file";

export function createDefaultTools(workspaceRoot: string): ToolMap {
  return {
    read_file: createReadFileTool(workspaceRoot),
    write_file: createWriteFileTool(workspaceRoot),
    edit_file: createEditFileTool(workspaceRoot),
    run_command: createRunCommandTool(workspaceRoot),
  };
}
