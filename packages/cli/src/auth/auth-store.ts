import { chmod, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";

export const CHATGPT_CODEX_BASE_URL = "https://chatgpt.com/backend-api/codex";

const CODEX_OAUTH_CLIENT_ID = "app_EMoamEEZ73f0CkXaXp7hrann";
const CHATGPT_ACCESS_TOKEN_REFRESH_WINDOW_MS = 5 * 60 * 1000;
const CHATGPT_TOKEN_REFRESH_INTERVAL_MS = 8 * 24 * 60 * 60 * 1000;

export type StoredAuthProvider = "openai-api-key" | "chatgpt";

export type StoredAuth = {
  provider?: StoredAuthProvider;
  openai?: {
    apiKey?: string;
    model?: string;
  };
  chatgpt?: {
    model?: string;
  };
};

export type OpenAIApiKeyAuthInput = {
  apiKey: string;
  model?: string;
};

export type ChatGptAuthInput = {
  model?: string;
};

export type ResolvedOpenAIApiKeyAuth = OpenAIApiKeyAuthInput & {
  type: "openai-api-key";
  source: "env" | "auth-file";
};

export type ResolvedChatGptAuth = {
  type: "chatgpt";
  accessToken: string;
  accountId: string;
  model?: string;
  baseURL: string;
  source: "codex-auth-file";
  codexAuthFile: string;
  email?: string;
  planType?: string;
  isFedrampAccount: boolean;
};

export type ResolvedAuth = ResolvedOpenAIApiKeyAuth | ResolvedChatGptAuth;

type JsonObject = Record<string, unknown>;

type CodexChatGptAuth = {
  raw: JsonObject;
  accessToken: string;
  refreshToken: string;
  accountId: string;
  email?: string;
  planType?: string;
  isFedrampAccount: boolean;
  accessTokenExpiresAt?: number;
  lastRefreshAt?: number;
};

type ResolveChatGptAuthOptions = {
  env?: NodeJS.ProcessEnv;
  model?: string;
  required?: boolean;
};

export function authDirectory(env: NodeJS.ProcessEnv = process.env): string {
  return resolve(env.TINYLOOP_HOME?.trim() || join(homedir(), ".tinyloop"));
}

export function authFilePath(env: NodeJS.ProcessEnv = process.env): string {
  return join(authDirectory(env), "auth.json");
}

export function codexAuthDirectory(env: NodeJS.ProcessEnv = process.env): string {
  return resolve(env.CODEX_HOME?.trim() || join(homedir(), ".codex"));
}

export function codexAuthFilePath(env: NodeJS.ProcessEnv = process.env): string {
  return join(codexAuthDirectory(env), "auth.json");
}

export async function loadAuthConfig(path = authFilePath()): Promise<StoredAuth> {
  const parsed = await readJsonObject(path, { missingAsUndefined: true });
  return (parsed ?? {}) as StoredAuth;
}

export async function saveOpenAIAuth(auth: OpenAIApiKeyAuthInput, path = authFilePath()): Promise<void> {
  const current = await loadAuthConfig(path);
  const next: StoredAuth = {
    ...current,
    provider: "openai-api-key",
    openai: {
      ...current.openai,
      apiKey: auth.apiKey,
      model: auth.model ?? current.openai?.model,
    },
  };

  await writePrivateJson(path, next);
}

export async function saveChatGptAuthPreference(auth: ChatGptAuthInput = {}, path = authFilePath()): Promise<void> {
  const current = await loadAuthConfig(path);
  const next: StoredAuth = {
    ...current,
    provider: "chatgpt",
    chatgpt: {
      ...current.chatgpt,
      model: auth.model ?? current.chatgpt?.model,
    },
  };

  await writePrivateJson(path, next);
}

export async function clearStoredAuth(path = authFilePath()): Promise<void> {
  await rm(path, { force: true });
}

export async function resolveAuth(env: NodeJS.ProcessEnv = process.env): Promise<ResolvedAuth | undefined> {
  const envApiKey = cleanString(env.OPENAI_API_KEY);
  const envModel = cleanString(env.OPENAI_MODEL);

  if (envApiKey) {
    return {
      type: "openai-api-key",
      apiKey: envApiKey,
      model: envModel,
      source: "env",
    };
  }

  const storedAuth = await loadAuthConfig(authFilePath(env));
  if (storedAuth.provider === "chatgpt") {
    return resolveChatGptAuth({
      env,
      model: envModel ?? cleanString(storedAuth.chatgpt?.model),
      required: true,
    });
  }

  const storedApiKey = cleanString(storedAuth.openai?.apiKey);
  if (storedApiKey) {
    return {
      type: "openai-api-key",
      apiKey: storedApiKey,
      model: envModel ?? cleanString(storedAuth.openai?.model),
      source: "auth-file",
    };
  }

  if (storedAuth.provider === "openai-api-key") {
    return undefined;
  }

  return resolveChatGptAuth({
    env,
    model: envModel ?? cleanString(storedAuth.chatgpt?.model),
    required: false,
  });
}

export async function resolveChatGptAuth(
  options: ResolveChatGptAuthOptions = {},
): Promise<ResolvedChatGptAuth | undefined> {
  const env = options.env ?? process.env;
  const codexAuthFile = codexAuthFilePath(env);
  const raw = await readJsonObject(codexAuthFile, { missingAsUndefined: true });

  if (!raw) {
    if (options.required) {
      throw new Error(`No Codex ChatGPT login found at ${codexAuthFile}. Run \`codex login\` first.`);
    }
    return undefined;
  }

  let auth = parseCodexChatGptAuth(raw);
  if (!auth) {
    if (options.required) {
      throw new Error(`Codex auth at ${codexAuthFile} is not a ChatGPT login. Run \`codex login\`.`);
    }
    return undefined;
  }

  if (shouldRefreshChatGptAuth(auth)) {
    auth = await refreshCodexChatGptAuth(auth, codexAuthFile, env);
  }

  return {
    type: "chatgpt",
    accessToken: auth.accessToken,
    accountId: auth.accountId,
    model: options.model,
    baseURL: cleanString(env.TINYLOOP_CHATGPT_BASE_URL) ?? CHATGPT_CODEX_BASE_URL,
    source: "codex-auth-file",
    codexAuthFile,
    email: auth.email,
    planType: auth.planType,
    isFedrampAccount: auth.isFedrampAccount,
  };
}

export function redactApiKey(apiKey: string): string {
  if (apiKey.length <= 8) {
    return "configured";
  }

  return `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}`;
}

export function describeResolvedAuth(auth: ResolvedAuth): string {
  switch (auth.type) {
    case "openai-api-key":
      return `OpenAI API key (${auth.source})`;
    case "chatgpt":
      return `ChatGPT subscription (${auth.source})`;
  }
}

async function refreshCodexChatGptAuth(
  auth: CodexChatGptAuth,
  codexAuthFile: string,
  env: NodeJS.ProcessEnv,
): Promise<CodexChatGptAuth> {
  const refreshUrl = cleanString(env.CODEX_REFRESH_TOKEN_URL_OVERRIDE) ?? "https://auth.openai.com/oauth/token";
  const clientId = cleanString(env.CODEX_APP_SERVER_LOGIN_CLIENT_ID) ?? CODEX_OAUTH_CLIENT_ID;

  const response = await fetch(refreshUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: clientId,
      grant_type: "refresh_token",
      refresh_token: auth.refreshToken,
    }),
  });

  if (!response.ok) {
    throw new Error(`Could not refresh Codex ChatGPT auth (${response.status}). Run \`codex login\` again.`);
  }

  const refreshResponse = asObject(await response.json());
  if (!refreshResponse) {
    throw new Error("Could not refresh Codex ChatGPT auth: refresh response was not a JSON object.");
  }

  const nextRaw = {
    ...auth.raw,
    tokens: {
      ...(asObject(auth.raw.tokens) ?? {}),
    },
    last_refresh: new Date().toISOString(),
  };
  const nextTokens = asObject(nextRaw.tokens);
  if (!nextTokens) {
    throw new Error("Could not refresh Codex ChatGPT auth: token data is missing.");
  }

  const idToken = readString(refreshResponse.id_token);
  const accessToken = readString(refreshResponse.access_token);
  const refreshToken = readString(refreshResponse.refresh_token);

  if (idToken) {
    nextTokens.id_token = idToken;
  }
  if (accessToken) {
    nextTokens.access_token = accessToken;
  }
  if (refreshToken) {
    nextTokens.refresh_token = refreshToken;
  }

  await writePrivateJson(codexAuthFile, nextRaw);

  const nextAuth = parseCodexChatGptAuth(nextRaw);
  if (!nextAuth) {
    throw new Error("Could not refresh Codex ChatGPT auth: refreshed auth could not be read.");
  }
  return nextAuth;
}

function parseCodexChatGptAuth(raw: JsonObject): CodexChatGptAuth | undefined {
  const authMode = cleanString(readString(raw.auth_mode));
  if (authMode && authMode !== "chatgpt" && authMode !== "chatgptAuthTokens") {
    return undefined;
  }
  if (cleanString(readString(raw.OPENAI_API_KEY))) {
    return undefined;
  }

  const tokens = asObject(raw.tokens);
  if (!tokens) {
    return undefined;
  }

  const accessToken = cleanString(readString(tokens.access_token));
  const refreshToken = cleanString(readString(tokens.refresh_token));
  const idToken = cleanString(readString(tokens.id_token));
  if (!accessToken || !refreshToken) {
    return undefined;
  }

  const idClaims = idToken ? decodeJwtPayload(idToken) : undefined;
  const authClaims = asObject(idClaims?.["https://api.openai.com/auth"]);
  const profileClaims = asObject(idClaims?.["https://api.openai.com/profile"]);
  const accountId =
    cleanString(readString(tokens.account_id)) ?? cleanString(readString(authClaims?.chatgpt_account_id));
  if (!accountId) {
    return undefined;
  }

  return {
    raw,
    accessToken,
    refreshToken,
    accountId,
    email: cleanString(readString(idClaims?.email)) ?? cleanString(readString(profileClaims?.email)),
    planType: cleanString(readString(authClaims?.chatgpt_plan_type))?.toLowerCase(),
    isFedrampAccount: authClaims?.chatgpt_account_is_fedramp === true,
    accessTokenExpiresAt: parseJwtExpiration(accessToken),
    lastRefreshAt: parseDate(raw.last_refresh),
  };
}

function shouldRefreshChatGptAuth(auth: CodexChatGptAuth): boolean {
  if (auth.accessTokenExpiresAt) {
    return auth.accessTokenExpiresAt <= Date.now() + CHATGPT_ACCESS_TOKEN_REFRESH_WINDOW_MS;
  }

  if (auth.lastRefreshAt) {
    return auth.lastRefreshAt < Date.now() - CHATGPT_TOKEN_REFRESH_INTERVAL_MS;
  }

  return false;
}

async function readJsonObject(path: string, options: { missingAsUndefined: boolean }): Promise<JsonObject | undefined> {
  let raw: string;

  try {
    raw = await readFile(path, "utf-8");
  } catch (error) {
    if (options.missingAsUndefined && isFileNotFoundError(error)) {
      return undefined;
    }

    throw error;
  }

  if (raw.trim().length === 0) {
    return {};
  }

  const parsed = JSON.parse(raw);
  const object = asObject(parsed);
  if (!object) {
    throw new Error(`Auth file must contain a JSON object: ${path}`);
  }

  return object;
}

async function writePrivateJson(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf-8", mode: 0o600 });
  await chmod(dirname(path), 0o700).catch(() => undefined);
  await chmod(path, 0o600).catch(() => undefined);
}

function decodeJwtPayload(jwt: string): JsonObject | undefined {
  const parts = jwt.split(".");
  if (parts.length < 2 || !parts[1]) {
    return undefined;
  }

  try {
    let payload = parts[1].replaceAll("-", "+").replaceAll("_", "/");
    while (payload.length % 4 !== 0) {
      payload += "=";
    }
    return asObject(JSON.parse(Buffer.from(payload, "base64").toString("utf-8")));
  } catch {
    return undefined;
  }
}

function parseJwtExpiration(jwt: string): number | undefined {
  const exp = decodeJwtPayload(jwt)?.exp;
  return typeof exp === "number" ? exp * 1000 : undefined;
}

function parseDate(value: unknown): number | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : undefined;
}

function asObject(value: unknown): JsonObject | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonObject) : undefined;
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function cleanString(value: string | undefined): string | undefined {
  const trimmedValue = value?.trim();
  return trimmedValue && trimmedValue.length > 0 ? trimmedValue : undefined;
}

function isFileNotFoundError(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}
