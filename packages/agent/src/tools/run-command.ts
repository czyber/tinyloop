import { spawn } from "node:child_process";
import type { ToolHandler, ToolResult, ToolRunContext } from "./registry";
import { requiredStringArg } from "./registry";

export type RunCommandLineToolDetails = {
  command: string;
  stdout: string;
  stderr: string;
  exitCode?: number | null;
};

function formatCommandOutput(details: RunCommandLineToolDetails): string {
  return [`exit_code: ${details.exitCode}`, "stdout:", details.stdout, "stderr:", details.stderr].join("\n");
}

export async function runCommandTool(
  workspaceRoot: string,
  command: string,
  context: ToolRunContext,
): Promise<ToolResult<RunCommandLineToolDetails>> {
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
      context.emit({ type: "tool.execution.progress", name: context.name, callId: context.callId, progress: chunk });
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
      const details: RunCommandLineToolDetails = {
        command,
        stdout,
        stderr,
        exitCode,
      };
      resolve({
        output: formatCommandOutput(details),
        details,
      });
    });
  });
}

export function createRunCommandTool(workspaceRoot: string): ToolHandler<RunCommandLineToolDetails> {
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
    run: async (input, context: ToolRunContext) => {
      const command = requiredStringArg(input, "command");
      return await runCommandTool(workspaceRoot, command, context);
    },
  };
}
