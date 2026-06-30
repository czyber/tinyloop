import { stdin, stdout } from "node:process";
import {
  authFilePath,
  clearOpenAIAuth,
  loadAuthConfig,
  type ResolvedOpenAIAuth,
  redactApiKey,
  resolveOpenAIAuth,
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

    default:
      throw new Error(`Unknown auth command: ${command}`);
  }
}

export async function promptForMissingOpenAIAuth(): Promise<ResolvedOpenAIAuth> {
  console.log("No OpenAI API key found.");
  console.log("tinyloop can save one locally so you do not need a project .env file.");
  console.log(`Auth file: ${authFilePath()}`);
  console.log("");

  const apiKey = await promptOpenAIApiKey();
  await saveOpenAIAuth({ apiKey });
  console.log("Saved OpenAI API key.");
  console.log("");

  return {
    apiKey,
    source: "auth-file",
  };
}

function printAuthHelp(): void {
  console.log(`Usage:
  tinyloop auth login [--model <model>]
  tinyloop auth status
  tinyloop auth logout
  tinyloop auth path

Credentials:
  OPENAI_API_KEY overrides stored auth.
  Stored auth lives at ${authFilePath()}`);
}

async function login(args: string[]): Promise<void> {
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

async function logout(): Promise<void> {
  await clearOpenAIAuth();
  console.log("Removed stored tinyloop auth.");
}

async function status(): Promise<void> {
  const resolvedAuth = await resolveOpenAIAuth();

  if (resolvedAuth) {
    console.log(`OpenAI API key: ${redactApiKey(resolvedAuth.apiKey)} (${resolvedAuth.source})`);
    if (resolvedAuth.model) {
      console.log(`Model: ${resolvedAuth.model}`);
    }
    return;
  }

  const storedAuth = await loadAuthConfig();
  const storedApiKey = storedAuth.openai?.apiKey;

  if (storedApiKey) {
    console.log(`OpenAI API key: ${redactApiKey(storedApiKey)} (auth-file)`);
    return;
  }

  console.log("OpenAI API key: not configured");
  console.log("Run `tinyloop auth login` to save one locally.");
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
