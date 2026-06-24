#!/usr/bin/env node

import { existsSync } from "node:fs";
import { dirname, join, parse } from "node:path";
import * as dotenv from "dotenv";
import { render } from "ink";
import { App } from "./components/app.js";
import { createAgentSessionDriver } from "./session/agent-session-driver.js";
import { createDemoSessionDriver } from "./session/demo-session-driver.js";

const workspaceRoot = findWorkspaceRoot(process.cwd());
dotenv.config({ path: join(workspaceRoot, ".env"), quiet: true });

const isDemoMode = process.argv.includes("--demo") || process.env.TINYLOOP_DEMO === "1";
const sessionDriver = isDemoMode ? createDemoSessionDriver() : createAgentSessionDriver(workspaceRoot);

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

render(<App mode={isDemoMode ? "demo" : "agent"} sessionDriver={sessionDriver} />);
