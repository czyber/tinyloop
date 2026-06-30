import { chmod, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";

export type StoredAuth = {
  openai?: {
    apiKey?: string;
    model?: string;
  };
};

export type OpenAIAuthInput = {
  apiKey: string;
  model?: string;
};

export type ResolvedOpenAIAuth = OpenAIAuthInput & {
  source: "env" | "auth-file";
};

export function authDirectory(env: NodeJS.ProcessEnv = process.env): string {
  return resolve(env.TINYLOOP_HOME?.trim() || join(homedir(), ".tinyloop"));
}

export function authFilePath(env: NodeJS.ProcessEnv = process.env): string {
  return join(authDirectory(env), "auth.json");
}

export async function loadAuthConfig(path = authFilePath()): Promise<StoredAuth> {
  let raw: string;

  try {
    raw = await readFile(path, "utf-8");
  } catch (error) {
    if (isFileNotFoundError(error)) {
      return {};
    }

    throw error;
  }

  if (raw.trim().length === 0) {
    return {};
  }

  const parsed = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`Auth file must contain a JSON object: ${path}`);
  }

  return parsed as StoredAuth;
}

export async function saveOpenAIAuth(auth: OpenAIAuthInput, path = authFilePath()): Promise<void> {
  const current = await loadAuthConfig(path);
  const next: StoredAuth = {
    ...current,
    openai: {
      ...current.openai,
      apiKey: auth.apiKey,
      model: auth.model ?? current.openai?.model,
    },
  };

  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(next, null, 2)}\n`, { encoding: "utf-8", mode: 0o600 });
  await chmod(path, 0o600).catch(() => undefined);
}

export async function clearOpenAIAuth(path = authFilePath()): Promise<void> {
  await rm(path, { force: true });
}

export async function resolveOpenAIAuth(env: NodeJS.ProcessEnv = process.env): Promise<ResolvedOpenAIAuth | undefined> {
  const envApiKey = cleanString(env.OPENAI_API_KEY);
  const envModel = cleanString(env.OPENAI_MODEL);

  if (envApiKey) {
    return {
      apiKey: envApiKey,
      model: envModel,
      source: "env",
    };
  }

  const auth = await loadAuthConfig(authFilePath(env));
  const storedApiKey = cleanString(auth.openai?.apiKey);
  if (!storedApiKey) {
    return undefined;
  }

  return {
    apiKey: storedApiKey,
    model: envModel ?? cleanString(auth.openai?.model),
    source: "auth-file",
  };
}

export function redactApiKey(apiKey: string): string {
  if (apiKey.length <= 8) {
    return "configured";
  }

  return `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}`;
}

function cleanString(value: string | undefined): string | undefined {
  const trimmedValue = value?.trim();
  return trimmedValue && trimmedValue.length > 0 ? trimmedValue : undefined;
}

function isFileNotFoundError(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}
