#!/usr/bin/env node

import { existsSync } from "node:fs";
import { dirname, join, parse } from "node:path";
import * as dotenv from "dotenv";
import { render } from "ink";
import { App } from "./components/app.js";
import { createAgentSessionDriver } from "./session/agent-session-driver.js";

const workspaceRoot = findWorkspaceRoot(process.cwd());
dotenv.config({ path: join(workspaceRoot, ".env"), quiet: true });

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
