import { spawn } from "node:child_process";
import type { ToolHandler } from "./registry";
import { requiredStringArg } from "./registry";

export async function runCommandTool(workspaceRoot: string, command: string): Promise<string> {
  return await new Promise((resolve, reject) => {
    const childProcess = spawn(command, { cwd: workspaceRoot, shell: true });
    let stdout = "";
    let stderr = "";

    const timeout = setTimeout(() => {
      childProcess.kill();
      reject(new Error("Command timed out"));
    }, 60_000);

    childProcess.stdout.setEncoding("utf-8");
    childProcess.stdout.on("data", (chunk) => {
      stdout += chunk;
    });

    childProcess.stderr.setEncoding("utf-8");
    childProcess.stderr.on("data", (chunk) => {
      stderr += chunk;
    });

    childProcess.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });

    childProcess.on("close", (exitCode) => {
      clearTimeout(timeout);
      resolve([`exit_code: ${exitCode}`, "stdout:", stdout.trimEnd(), "stderr:", stderr.trimEnd()].join("\n"));
    });
  });
}

export function createRunCommandTool(workspaceRoot: string): ToolHandler {
  return {
    definition: {
      type: "function",
      name: "run_command",
      description: "Run a bash command.",
      parameters: {
        type: "object",
        properties: {
          command: {
            type: "string",
            description: "The bash command to be run.",
          },
        },
        required: ["command"],
        additionalProperties: false,
      },
      strict: true,
    },
    run: async (input) => {
      const command = requiredStringArg(input, "command");
      return await runCommandTool(workspaceRoot, command);
    },
  };
}
