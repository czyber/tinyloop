import { existsSync } from "node:fs";
import { dirname, join, parse } from "node:path";
import * as dotenv from "dotenv";
import { render } from "ink";
import { App } from "./components/app.js";
import { createAgentSessionDriver } from "./session/agent-session-driver.js";
import { createFakeSessionDriver } from "./session/fake-session-driver.js";

const workspaceRoot = findWorkspaceRoot(process.cwd());
dotenv.config({ path: join(workspaceRoot, ".env"), quiet: true });

const sessionDriver1 = createFakeSessionDriver({
  events: [
    { type: "turn.started", turnId: "t-1", sessionId: "s-1", sequence: 1 },
    { type: "user.message", turnId: "t-1", sessionId: "s-1", sequence: 2, text: "Hello" },
    {
      type: "tool.started",
      turnId: "t-1",
      sessionId: "s-1",
      sequence: 3,
      callId: "call-1",
      name: "run_command",
      args: JSON.stringify({ command: "pwd" }),
    },
    {
      type: "tool.progress",
      turnId: "t-1",
      sessionId: "s-1",
      sequence: 4,
      callId: "call-1",
      name: "run_command",
      text: "/tmp/tinyloop\n",
    },
    {
      type: "tool.finished",
      turnId: "t-1",
      sessionId: "s-1",
      sequence: 5,
      callId: "call-1",
      name: "run_command",
      details: { command: "pwd", stdout: "/tmp/tinyloop\n", stderr: "", exitCode: 0 },
    },
    { type: "assistant.message", turnId: "t-1", sessionId: "s-1", sequence: 6, text: "Hello! How can I help?" },
    { type: "turn.completed", turnId: "t-1", sessionId: "s-1", sequence: 7 },
  ],
});

const sessionDriver = createAgentSessionDriver(workspaceRoot);

function findWorkspaceRoot(startPath: string): string {
  let currentPath = startPath;
  const rootPath = parse(currentPath).root;

  while (true) {
    if (existsSync(join(currentPath, "pnpm-workspace.yaml"))) {
      return currentPath;
    }

    if (currentPath === rootPath) {
      return startPath;
    }

    currentPath = dirname(currentPath);
  }
}

render(<App sessionDriver={sessionDriver} />);
