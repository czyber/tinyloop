import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { OpenAI } from "openai";
import { Agent } from "../src/agent.js";

const requests: unknown[] = [];
const workspaceRoot = join(import.meta.dirname, "..", "..", "..");

const client = {
  responses: {
    stream: (request: unknown) => {
      requests.push(request);
      return streamFromEvents(requests.length === 1 ? firstResponseEvents() : secondResponseEvents());
    },
  },
} as unknown as OpenAI;

const agent = new Agent({
  client,
  workspaceRoot,
  streamResponses: true,
  storeResponses: false,
  usePreviousResponseId: false,
  maxToolTurns: 2,
});

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main(): Promise<void> {
  const toolEvents: unknown[] = [];
  const response = await agent.runOneUserTurn("Read the workspace package name.", {
    emit: (event) => toolEvents.push(event),
  });

  assert.equal(response, "tinyloop-workspace");
  assert.equal(requests.length, 2);

  const firstRequest = requests[0] as StreamRequest;
  assert.equal(firstRequest.store, false);
  assert.equal(firstRequest.previous_response_id, undefined);
  assert.deepEqual(
    firstRequest.input.map((item) => item.type ?? item.role),
    ["user"],
  );

  const packageJson = JSON.parse(await readFile(join(workspaceRoot, "package.json"), "utf-8")) as { name: string };
  assert.equal(packageJson.name, "tinyloop-workspace");

  const secondRequest = requests[1] as StreamRequest;
  assert.equal(secondRequest.store, false);
  assert.equal(secondRequest.previous_response_id, undefined);
  assert.deepEqual(
    secondRequest.input.map((item) => item.type ?? item.role),
    ["user", "function_call", "function_call_output"],
  );
  assert.match(secondRequest.input[2]?.output ?? "", /tinyloop-workspace/);
  assert.deepEqual(
    toolEvents.map((event) => (event as { type: string }).type),
    ["tool.execution.started", "tool.execution.finished"],
  );
}

type StreamRequest = {
  input: Array<{ type?: string; role?: string; output?: string }>;
  store?: boolean;
  previous_response_id?: string;
};

async function* streamFromEvents(events: unknown[]): AsyncIterable<never> {
  for (const event of events) {
    yield event as never;
  }
}

function firstResponseEvents(): unknown[] {
  const id = "resp_tool";
  const item = {
    type: "function_call",
    call_id: "call_read_file",
    name: "read_file",
    arguments: JSON.stringify({ path: "package.json" }),
    status: "completed",
  };

  return [
    {
      type: "response.output_item.done",
      output_index: 0,
      item,
      sequence_number: 1,
    },
    {
      type: "response.completed",
      response: responseEnvelope(id),
      sequence_number: 2,
    },
  ];
}

function secondResponseEvents(): unknown[] {
  const id = "resp_final";
  const item = {
    type: "message",
    role: "assistant",
    status: "completed",
    content: [{ type: "output_text", text: "tinyloop-workspace", annotations: [], logprobs: [] }],
  };

  return [
    {
      type: "response.output_item.done",
      output_index: 0,
      item,
      sequence_number: 1,
    },
    {
      type: "response.completed",
      response: responseEnvelope(id),
      sequence_number: 2,
    },
  ];
}

function responseEnvelope(id: string): unknown {
  return {
    id,
    object: "response",
    created_at: 0,
    output_text: "",
    error: null,
    incomplete_details: null,
    instructions: null,
    metadata: {},
    model: "gpt-5.4-mini",
    output: [],
    parallel_tool_calls: true,
    temperature: 1,
    tool_choice: "auto",
    tools: [],
    top_p: 1,
    background: false,
    max_output_tokens: null,
    max_tool_calls: null,
    previous_response_id: null,
    reasoning: null,
    service_tier: "auto",
    status: "completed",
    text: { format: { type: "text" } },
    truncation: "disabled",
    usage: null,
  };
}
