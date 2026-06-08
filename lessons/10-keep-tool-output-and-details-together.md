# Keep Tool Output And Details Together

## Recommendation

Represent a tool result as one object with two fields:

```ts
export type ToolResult<TDetails = unknown> = {
  output: string;
  details?: TDetails;
};
```

`output` is the compact string sent back to the model. `details` is structured data retained for events, rendering, and future session state.

This is not really "returning two things." The tool returns one durable result object. Different consumers read the part they need.

## Why This Matters

The model needs text. A UI needs shape.

For `run_command`, the model can work with a compact string containing exit code, stdout, and stderr. A UI should not have to parse that string back into fields. It should receive command, stdout, stderr, exit code, duration, timeout state, and truncation state as data.

For file tools, the model usually needs file contents or a diff. A UI may need path, created versus updated state, diff text, truncation state, and later maybe structured hunks.

If Tinyloop only keeps strings, every future UI has to reverse-engineer structure from prose.

## What Pi Does

Pi uses the same idea with different names.

Custom tools return one result object with:

- `content`: model-facing content, usually text parts like `{ type: "text", text: "Done" }`
- `details`: structured data for renderers, events, and state reconstruction

Pi renderers receive the whole result and can read `result.details`. If no custom renderer exists, Pi falls back to showing raw text from `content`.

Pi's RPC event layer keeps the same shape. `tool_execution_update` carries `partialResult`, and `tool_execution_end` carries `result`. Both contain `content` and `details`.

References:

- https://pi.dev/docs/latest/extensions
- https://pi.dev/docs/latest/rpc

## Tinyloop Naming

Tinyloop does not need Pi's full content-part structure yet. The OpenAI Responses API path currently needs one `function_call_output.output` string, so keep the local type smaller:

```ts
export type ToolResult<TDetails = unknown> = {
  output: string;
  details?: TDetails;
};
```

Use these names:

- `ToolResult`: what a local tool returns
- `FunctionCallOutput`: the OpenAI API message sent back to the model
- `ToolExecutionResult`: the internal wrapper that can hold both the local result and the API output
- `AgentEvent`: the public execution event shape for terminals, TUIs, and future GUIs

Avoid naming the local tool result `ToolOutput`. That name is too easy to confuse with the OpenAI `function_call_output`.

## Event Flow

The agent should keep the local result until after events have been emitted.

```txt
tool.run(args)
  -> ToolResult
  -> tool.execution.finished gets output and details
  -> FunctionCallOutput gets only output
  -> model receives FunctionCallOutput
```

The event layer should expose completed results like this:

```ts
type ToolExecutionFinished = {
  type: "tool.execution.finished";
  name: string;
  callId: string;
  output: string;
  details?: unknown;
};
```

Keep `details` on the finished event first. Add progress events later when `run_command` streams output.

## What To Do Next

First, keep the current `ToolResult<TDetails>` type in the tool registry.

Then change the registry handler to return a local execution wrapper instead of immediately throwing away `details`:

```ts
export type ToolExecutionResult = {
  result: ToolResult;
  functionCallOutput: FunctionCallOutput;
};
```

After that, update `runToolCalls` so it emits `result.output` and `result.details`, while pushing only `functionCallOutput` into the next model request.

For `run_command`, prefer a details shape like:

```ts
export type RunCommandToolDetails = {
  kind: "command";
  command: string;
  exitCode: number | null;
  stdout: string;
  stderr: string;
  durationMs: number;
  timedOut: boolean;
};
```

Do not overbuild file diffs yet. Store unified diff text first. Add structured hunks only when a UI actually needs them.

## Design Questions

- Should tool errors become `tool.execution.failed` events with structured details?
- Should large `details` payloads be truncated, stored out of band, or both?
- Should absolute paths appear in model output, UI details, neither, or only in debug views?
- Should `details` be persisted in session history or only streamed live?
- Should every tool detail type include a `kind` discriminator?

## UI Notes

Ink can render the compact `output` by default and use `details` for expanded views.

React/Tailwind/shadcn can render `details` directly as command tabs, file badges, diff panels, timeout states, and truncation notices. It should not parse model text to recover those fields.
