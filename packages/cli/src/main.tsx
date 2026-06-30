#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { dirname, join, parse } from "node:path";
import { fileURLToPath } from "node:url";
import * as dotenv from "dotenv";
import { render } from "ink";
import { App, createDemoSessionDriver } from "tinyloop-tui";
import { promptForMissingAuth, runAuthCommand } from "./auth/auth-cli.js";
import { type ResolvedAuth, resolveAuth } from "./auth/auth-store.js";
import { createAgentSessionDriver } from "./session/agent-session-driver.js";

async function main(): Promise<void> {
  const args = normalizeArgs(process.argv.slice(2));

  if (args[0] === "auth") {
    await runAuthCommand(args.slice(1));
    return;
  }

  if (hasFlag(args, "--help") || hasFlag(args, "-h")) {
    printHelp();
    return;
  }

  if (hasFlag(args, "--version") || hasFlag(args, "-v")) {
    console.log(readPackageVersion());
    return;
  }

  const workspaceRoot = findWorkspaceRoot(process.cwd());
  dotenv.config({ path: join(workspaceRoot, ".env"), quiet: true });

  const isDemoMode = hasFlag(args, "--demo") || process.env.TINYLOOP_DEMO === "1";
  const sessionDriver = isDemoMode
    ? createDemoSessionDriver()
    : createAgentSessionDriver(workspaceRoot, await resolveAgentOptions());

  render(<App mode={isDemoMode ? "demo" : "agent"} sessionDriver={sessionDriver} />);
}

function normalizeArgs(args: string[]): string[] {
  return args[0] === "--" ? args.slice(1) : args;
}

async function resolveAgentOptions(): Promise<{
  apiKey: string;
  model?: string;
  baseURL?: string;
  defaultHeaders?: Record<string, string>;
  streamResponses?: boolean;
  storeResponses?: boolean;
  usePreviousResponseId?: boolean;
}> {
  const auth = (await resolveAuth()) ?? (await promptForMissingAuth());
  return toAgentOptions(auth);
}

function toAgentOptions(auth: ResolvedAuth): {
  apiKey: string;
  model?: string;
  baseURL?: string;
  defaultHeaders?: Record<string, string>;
  streamResponses?: boolean;
  storeResponses?: boolean;
  usePreviousResponseId?: boolean;
} {
  if (auth.type === "openai-api-key") {
    return {
      apiKey: auth.apiKey,
      model: auth.model,
    };
  }

  const defaultHeaders: Record<string, string> = {
    "ChatGPT-Account-ID": auth.accountId,
    "OAI-Product-Sku": "codex",
  };
  if (auth.isFedrampAccount) {
    defaultHeaders["X-OpenAI-Fedramp"] = "true";
  }

  return {
    apiKey: auth.accessToken,
    model: auth.model,
    baseURL: auth.baseURL,
    defaultHeaders,
    streamResponses: true,
    storeResponses: false,
    usePreviousResponseId: false,
  };
}

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

function printHelp(): void {
  console.log(`tinyloop ${readPackageVersion()}

Usage:
  tinyloop                 Start the coding agent in the current workspace
  tinyloop --demo          Start demo mode without an API key
  tinyloop auth login      Save an OpenAI API key locally
  tinyloop auth login chatgpt
                           Use a local Codex ChatGPT login
  tinyloop auth status     Show whether auth is configured
  tinyloop auth logout     Remove stored auth

Options:
  -h, --help               Show help
  -v, --version            Show version

Auth:
  OPENAI_API_KEY overrides stored auth.
  Run \`tinyloop auth login chatgpt\` to use ChatGPT subscription auth via Codex.`);
}

function hasFlag(args: string[], shortOrLongFlag: string): boolean {
  return args.includes(shortOrLongFlag);
}

function readPackageVersion(): string {
  const packageJsonPath = join(dirname(fileURLToPath(import.meta.url)), "..", "package.json");

  try {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8")) as { version?: unknown };
    return typeof packageJson.version === "string" ? packageJson.version : "unknown";
  } catch {
    return "unknown";
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
