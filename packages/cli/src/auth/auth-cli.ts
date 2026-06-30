import { spawn } from "node:child_process";
import { stdin, stdout } from "node:process";
import {
  authFilePath,
  clearStoredAuth,
  codexAuthFilePath,
  describeResolvedAuth,
  loadAuthConfig,
  type ResolvedAuth,
  redactApiKey,
  resolveAuth,
  resolveChatGptAuth,
  saveChatGptAuthPreference,
  saveOpenAIAuth,
} from "./auth-store.js";

export async function runAuthCommand(args: string[]): Promise<void> {
  const command = args[0] ?? "help";

  switch (command) {
    case "help":
    case "--help":
    case "-h":
      printAuthHelp();
      return;

    case "login":
      await login(args.slice(1));
      return;

    case "logout":
      await logout();
      return;

    case "status":
      await status();
      return;

    case "path":
      console.log(authFilePath());
      return;

    case "codex-path":
      console.log(codexAuthFilePath());
      return;

    default:
      throw new Error(`Unknown auth command: ${command}`);
  }
}

export async function promptForMissingAuth(): Promise<ResolvedAuth> {
  console.log("No tinyloop auth found.");
  console.log("Use `tinyloop auth login chatgpt` for ChatGPT subscription auth via Codex.");
  console.log("Or save an OpenAI API key locally so you do not need a project .env file.");
  console.log(`Auth file: ${authFilePath()}`);
  console.log("");

  const apiKey = await promptOpenAIApiKey();
  await saveOpenAIAuth({ apiKey });
  console.log("Saved OpenAI API key.");
  console.log("");

  return {
    type: "openai-api-key",
    apiKey,
    source: "auth-file",
  };
}

function printAuthHelp(): void {
  console.log(`Usage:
  tinyloop auth login [--model <model>]
  tinyloop auth login api-key [--model <model>]
  tinyloop auth login chatgpt [--model <model>]
  tinyloop auth status
  tinyloop auth logout
  tinyloop auth path
  tinyloop auth codex-path

Credentials:
  OPENAI_API_KEY overrides stored auth.
  API key auth lives at ${authFilePath()}
  ChatGPT auth reuses Codex auth at ${codexAuthFilePath()}`);
}

async function login(args: string[]): Promise<void> {
  const { method, methodArgs } = readLoginMethod(args);

  switch (method) {
    case "api-key":
    case "openai":
      await loginWithApiKey(methodArgs);
      return;

    case "chatgpt":
      await loginWithChatGpt(methodArgs);
      return;

    default:
      throw new Error(`Unknown auth login method: ${method}`);
  }
}

async function loginWithApiKey(args: string[]): Promise<void> {
  const model = readOption(args, "--model");

  console.log(`This stores your OpenAI API key locally at ${authFilePath()}.`);
  console.log("The key will not be printed back to the terminal.");
  console.log("");

  const apiKey = await promptOpenAIApiKey();
  await saveOpenAIAuth({ apiKey, model });

  console.log("Saved OpenAI API key.");
  if (model) {
    console.log(`Saved default model: ${model}`);
  }
}

async function loginWithChatGpt(args: string[]): Promise<void> {
  const model = readOption(args, "--model");
  let auth = await resolveChatGptAuth({ required: false, model });

  if (!auth) {
    console.log("No Codex ChatGPT login found. Starting `codex login`...");
    await runCodexLogin();
    auth = await resolveChatGptAuth({ required: true, model });
  }

  await saveChatGptAuthPreference({ model });

  console.log("Saved ChatGPT subscription auth preference.");
  console.log(`Codex auth file: ${auth?.codexAuthFile ?? codexAuthFilePath()}`);
  if (auth?.email) {
    console.log(`Account: ${auth.email}`);
  }
  if (auth?.planType) {
    console.log(`Plan: ${auth.planType}`);
  }
  if (model) {
    console.log(`Saved default model: ${model}`);
  }
}

async function logout(): Promise<void> {
  const storedAuth = await loadAuthConfig();
  await clearStoredAuth();
  console.log("Removed stored tinyloop auth.");
  if (storedAuth.provider === "chatgpt") {
    console.log("Codex ChatGPT auth was not removed. Run `codex logout` to remove it.");
  }
}

async function status(): Promise<void> {
  let resolvedAuth: ResolvedAuth | undefined;

  try {
    resolvedAuth = await resolveAuth();
  } catch (error) {
    console.log(`Auth error: ${error instanceof Error ? error.message : String(error)}`);
    return;
  }

  if (resolvedAuth) {
    console.log(`Provider: ${describeResolvedAuth(resolvedAuth)}`);
    if (resolvedAuth.type === "openai-api-key") {
      console.log(`OpenAI API key: ${redactApiKey(resolvedAuth.apiKey)}`);
    } else {
      console.log(`ChatGPT account: ${resolvedAuth.email ?? resolvedAuth.accountId}`);
      if (resolvedAuth.planType) {
        console.log(`Plan: ${resolvedAuth.planType}`);
      }
    }
    if (resolvedAuth.model) {
      console.log(`Model: ${resolvedAuth.model}`);
    }
    return;
  }

  const storedAuth = await loadAuthConfig();
  if (storedAuth.openai?.apiKey) {
    console.log(`OpenAI API key: ${redactApiKey(storedAuth.openai.apiKey)} (auth-file)`);
    return;
  }

  console.log("Auth: not configured");
  console.log("Run `tinyloop auth login chatgpt` to use a ChatGPT subscription via Codex.");
  console.log("Run `tinyloop auth login` to save an OpenAI API key locally.");
}

async function runCodexLogin(): Promise<void> {
  if (!stdin.isTTY || !stdout.isTTY) {
    throw new Error("ChatGPT auth requires an interactive Codex login. Run `codex login` first.");
  }

  await new Promise<void>((resolve, reject) => {
    const child = spawn("codex", ["login"], { stdio: "inherit" });

    child.on("error", (error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") {
        reject(new Error("Could not find `codex`. Install Codex, run `codex login`, then retry."));
        return;
      }
      reject(error);
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`codex login exited with status ${code ?? "unknown"}.`));
    });
  });
}

async function promptOpenAIApiKey(): Promise<string> {
  const apiKey = (await promptHidden("OpenAI API key: ")).trim();
  if (apiKey.length === 0) {
    throw new Error("OpenAI API key cannot be empty.");
  }

  return apiKey;
}

function promptHidden(question: string): Promise<string> {
  if (!stdin.isTTY || !stdout.isTTY) {
    throw new Error("Interactive auth requires a terminal. Set OPENAI_API_KEY instead.");
  }

  return new Promise((resolve, reject) => {
    let value = "";
    const wasRaw = stdin.isRaw;

    function cleanup() {
      stdin.off("data", onData);
      stdin.setRawMode(wasRaw);
      stdin.pause();
    }

    function finish() {
      stdout.write("\n");
      cleanup();
      resolve(value);
    }

    function cancel() {
      stdout.write("\n");
      cleanup();
      reject(new Error("Auth cancelled."));
    }

    function onData(chunk: Buffer | string) {
      for (const char of String(chunk)) {
        if (char === "\u0003") {
          cancel();
          return;
        }

        if (char === "\r" || char === "\n") {
          finish();
          return;
        }

        if (char === "\u007f" || char === "\b") {
          value = value.slice(0, -1);
          continue;
        }

        value += char;
      }
    }

    stdout.write(question);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf-8");
    stdin.on("data", onData);
  });
}

function readLoginMethod(args: string[]): { method: string; methodArgs: string[] } {
  const firstArg = args[0];
  if (!firstArg || firstArg.startsWith("-")) {
    return { method: "api-key", methodArgs: args };
  }

  return { method: firstArg, methodArgs: args.slice(1) };
}

function readOption(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  if (index === -1) {
    return undefined;
  }

  const value = args[index + 1];
  if (!value || value.startsWith("-")) {
    throw new Error(`Expected a value after ${name}.`);
  }

  return value;
}
