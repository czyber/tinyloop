import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  authFilePath,
  codexAuthDirectory,
  codexAuthFilePath,
  resolveAuth,
  resolveChatGptAuth,
  saveChatGptAuthPreference,
  saveOpenAIAuth,
} from "../src/auth/auth-store.js";

const tempRoot = await mkdtemp(join(tmpdir(), "tinyloop-auth-test-"));

await envApiKeyWins();
await storedApiKeyWinsOverAutoDetectedChatGptAuth();
await storedChatGptPreferenceResolvesCodexAuth();
await autoDetectsCodexChatGptAuth();
await refreshesExpiredCodexAccessToken();

async function envApiKeyWins(): Promise<void> {
  const env = testEnv("env-wins", { OPENAI_API_KEY: "sk-env", OPENAI_MODEL: "gpt-env" });
  await saveOpenAIAuth({ apiKey: "sk-stored", model: "gpt-stored" }, authFilePath(env));
  await writeCodexAuth(env, validCodexAuth());

  const auth = await resolveAuth(env);

  assert.equal(auth?.type, "openai-api-key");
  assert.equal(auth.apiKey, "sk-env");
  assert.equal(auth.model, "gpt-env");
  assert.equal(auth.source, "env");
}

async function storedApiKeyWinsOverAutoDetectedChatGptAuth(): Promise<void> {
  const env = testEnv("stored-api-key");
  await saveOpenAIAuth({ apiKey: "sk-stored", model: "gpt-stored" }, authFilePath(env));
  await writeCodexAuth(env, validCodexAuth());

  const auth = await resolveAuth(env);

  assert.equal(auth?.type, "openai-api-key");
  assert.equal(auth.apiKey, "sk-stored");
  assert.equal(auth.model, "gpt-stored");
  assert.equal(auth.source, "auth-file");
}

async function storedChatGptPreferenceResolvesCodexAuth(): Promise<void> {
  const env = testEnv("chatgpt-preference");
  await saveChatGptAuthPreference({ model: "gpt-5.4" }, authFilePath(env));
  await writeCodexAuth(env, validCodexAuth({ email: "coder@example.com", planType: "plus" }));

  const auth = await resolveAuth(env);

  assert.equal(auth?.type, "chatgpt");
  assert.equal(auth.accountId, "workspace-1");
  assert.equal(auth.email, "coder@example.com");
  assert.equal(auth.planType, "plus");
  assert.equal(auth.model, "gpt-5.4");
}

async function autoDetectsCodexChatGptAuth(): Promise<void> {
  const env = testEnv("auto-chatgpt");
  await writeCodexAuth(env, validCodexAuth({ accountId: "workspace-auto" }));

  const auth = await resolveAuth(env);

  assert.equal(auth?.type, "chatgpt");
  assert.equal(auth.accountId, "workspace-auto");
}

async function refreshesExpiredCodexAccessToken(): Promise<void> {
  const env = testEnv("refresh-chatgpt");
  const requestBodies: unknown[] = [];
  const server = createServer(async (request: IncomingMessage, response: ServerResponse) => {
    requestBodies.push(JSON.parse(await readRequestBody(request)));
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(
      JSON.stringify({
        id_token: fakeJwt({ accountId: "workspace-refresh", email: "fresh@example.com", planType: "pro" }),
        access_token: fakeJwt({ accountId: "workspace-refresh", expiresAt: futureSeconds() }),
        refresh_token: "new-refresh-token",
      }),
    );
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const address = server.address();
    assert.ok(address && typeof address === "object");

    const refreshEnv = {
      ...env,
      CODEX_REFRESH_TOKEN_URL_OVERRIDE: `http://127.0.0.1:${address.port}/oauth/token`,
    };
    await writeCodexAuth(
      refreshEnv,
      validCodexAuth({
        accountId: "workspace-refresh",
        expiresAt: pastSeconds(),
        refreshToken: "old-refresh-token",
      }),
    );

    const auth = await resolveChatGptAuth({ env: refreshEnv, required: true });

    assert.equal(auth?.type, "chatgpt");
    assert.equal(auth.accessToken.includes("new-refresh-token"), false);
    assert.equal(auth.email, "fresh@example.com");
    assert.equal(auth.planType, "pro");
    assert.deepEqual(requestBodies, [
      {
        client_id: "app_EMoamEEZ73f0CkXaXp7hrann",
        grant_type: "refresh_token",
        refresh_token: "old-refresh-token",
      },
    ]);

    const persisted = JSON.parse(await readFile(codexAuthFilePath(refreshEnv), "utf-8"));
    assert.equal(persisted.tokens.refresh_token, "new-refresh-token");
    assert.equal(persisted.tokens.account_id, "workspace-refresh");
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
}

function testEnv(name: string, extra: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
  return {
    TINYLOOP_HOME: join(tempRoot, name, "tinyloop"),
    CODEX_HOME: join(tempRoot, name, "codex"),
    ...extra,
  };
}

async function writeCodexAuth(env: NodeJS.ProcessEnv, auth: unknown): Promise<void> {
  await mkdir(codexAuthDirectory(env), { recursive: true });
  await writeFile(codexAuthFilePath(env), `${JSON.stringify(auth, null, 2)}\n`);
}

function validCodexAuth(options: Partial<FakeJwtOptions> & { refreshToken?: string } = {}): unknown {
  const accountId = options.accountId ?? "workspace-1";
  return {
    auth_mode: "chatgpt",
    OPENAI_API_KEY: null,
    tokens: {
      id_token: fakeJwt({ ...options, accountId }),
      access_token: fakeJwt({ ...options, accountId, expiresAt: options.expiresAt ?? futureSeconds() }),
      refresh_token: options.refreshToken ?? "refresh-token",
      account_id: accountId,
    },
    last_refresh: new Date().toISOString(),
  };
}

type FakeJwtOptions = {
  accountId: string;
  email: string;
  planType: string;
  expiresAt: number;
};

function fakeJwt(options: Partial<FakeJwtOptions> = {}): string {
  const payload = {
    exp: options.expiresAt,
    email: options.email ?? "user@example.com",
    "https://api.openai.com/auth": {
      chatgpt_account_id: options.accountId ?? "workspace-1",
      chatgpt_plan_type: options.planType ?? "business",
      chatgpt_account_is_fedramp: false,
    },
  };

  return `${base64UrlJson({ alg: "none", typ: "JWT" })}.${base64UrlJson(payload)}.sig`;
}

function base64UrlJson(value: unknown): string {
  return Buffer.from(JSON.stringify(value))
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function futureSeconds(): number {
  return Math.floor(Date.now() / 1000) + 60 * 60;
}

function pastSeconds(): number {
  return Math.floor(Date.now() / 1000) - 60;
}

async function readRequestBody(request: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf-8");
}
