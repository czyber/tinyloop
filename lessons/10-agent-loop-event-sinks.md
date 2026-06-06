# Agent Loop Event Sinks

## Recommendation

Keep `AgentSession` as the public event boundary, but let the agent loop emit its own lifecycle and tool events through a small callback.

Call that callback an event sink:

```ts
export type AgentEventSink = (event: AgentEvent) => void | Promise<void>;
```

The agent loop should not import `EventEmitter`, know about the CLI, or know about future GUI transport. It should only report events by calling the sink.

The session can then decide how to fan those events out:

```txt
Agent loop -> AgentEventSink -> AgentSession -> CLI / TUI / GUI / JSON stream
```

## Why This Matters

The current implementation emits events only in `AgentSession.dispatch()`.

That is fine for coarse turn events:

- `turn.started`
- `assistant.message`
- `turn.completed`
- `turn.failed`

But the interesting work happens deeper in the agent loop:

- the model response starts
- the model requests one or more tool calls
- a tool call starts
- a long-running command streams output
- a tool call succeeds or fails
- the loop sends tool results back to the model
- the loop continues into another model/tool turn

If events stay only in `AgentSession.dispatch()`, the session can only observe the outside of the turn. It cannot naturally emit "tool called" or "tool finished" because that information lives in `agent.ts` and `tools/registry.ts`.

An event sink solves that without making the agent loop depend on session internals.

## Current Tinyloop Shape

Today, the event stream is session-owned:

```txt
AgentSession.dispatch()
  emits turn.started
  calls agent.runOneUserTurn()
  emits assistant.message
  emits turn.completed or turn.failed
```

The public consumer API is:

```ts
for await (const event of session.events()) {
  renderCliEvent(event);
}
```

Internally this uses Node's `EventEmitter`:

```ts
private emit(event: AgentEvent): void {
  this.emitter.emit("event", event);
}
```

That is a consumer-side fan-out mechanism. It lets code outside the session receive events. It does not help the agent loop produce events unless the loop is given a way to report them.

## What An Event Sink Is

An event sink is just the producer-side callback.

It answers this question:

> When the agent loop notices something happened, where does it send the event?

Example:

```ts
await emit({
  type: "tool.execution.started",
  callId: toolCall.call_id,
  name: toolCall.name,
  args,
});
```

The loop does not need to know what `emit` does. In production, `AgentSession` can pass:

```ts
const response = await this.agent.runOneUserTurn(command.text, {
  emit: (event) => this.emit(event),
});
```

In tests, a sink can just collect events:

```ts
const events: AgentEvent[] = [];

await agent.runOneUserTurn("list files", {
  emit: (event) => events.push(event),
});
```

In JSON mode, a sink could write JSON lines:

```ts
await agent.runOneUserTurn(prompt, {
  emit: (event) => process.stdout.write(`${JSON.stringify(event)}\n`),
});
```

The point is not the callback itself. The point is that the loop stays headless while still becoming observable.

## Event Sink Versus EventEmitter

These are different layers.

```txt
EventSink
  producer-side API
  "agent loop, call this when something happens"

EventEmitter / subscribe / async iterator
  consumer-side API
  "outside code, receive events from the session"
```

For tinyloop, it is reasonable to keep the existing `EventEmitter` for now.

The resulting path would be:

```txt
agent.ts
  calls emit(event)

session.ts
  passes emit: (event) => this.emit(event)

EventEmitter
  wakes session.events() consumers

main.ts / future TUI / future GUI
  renders events
```

So the event sink does not replace `EventEmitter`. It gives the agent loop a clean way to feed `EventEmitter` indirectly.

## How Pi Handles This Layer

Pi uses the same conceptual split, but with a larger stack.

At the low level, Pi's agent loop accepts an `AgentEventSink`:

```ts
export type AgentEventSink = (event: AgentEvent) => Promise<void> | void;
```

The low-level loop calls that sink for events such as:

- `agent_start`
- `agent_end`
- `turn_start`
- `turn_end`
- `message_start`
- `message_update`
- `message_end`
- `tool_execution_start`
- `tool_execution_update`
- `tool_execution_end`

The stateful `Agent` wrapper passes a sink into the loop. That sink routes every event through `processEvents(event)`.

That wrapper does three important things:

1. It updates internal state from each event.
2. It tracks transient state such as the current streaming message and pending tool calls.
3. It notifies subscribers through `agent.subscribe(listener)`.

`AgentSession` then subscribes to the `Agent`.

The session layer handles session-level behavior:

- persistence
- extension dispatch
- queue updates
- compaction events
- retry events
- public session subscriptions

Pi's shape is roughly:

```txt
agent-loop.ts
  runAgentLoop(..., emit)
  emits low-level agent events through the sink

agent.ts
  owns state
  passes processEvents as the sink
  exposes subscribe(listener)

agent-session.ts
  subscribes to Agent
  persists and extends events
  exposes session-level subscriptions

CLI / RPC / JSON / SDK users
  consume session events
```

Pi does not make the low-level loop import Node's `EventEmitter`. The loop receives a function.

## Pi's Tool Event Model

Pi models tool execution as its own event lifecycle:

```txt
tool_execution_start
tool_execution_update
tool_execution_end
```

The start event includes:

- `toolCallId`
- `toolName`
- `args`

The update event is for streaming progress. For example, a bash tool can emit partial stdout/stderr while the command is still running.

The end event includes:

- `toolCallId`
- `toolName`
- final `result`
- `isError`

This is better than emitting only "tool called" because UIs need a stable lifecycle:

- show a pending tool panel
- append live output to that panel
- mark the panel as successful or failed
- keep the final tool result available for replay

For tinyloop, a first version can skip progress updates and start with only:

```ts
| { type: "tool.execution.started"; callId: string; name: string; args: ToolArgs }
| { type: "tool.execution.completed"; callId: string; name: string; output: string }
| { type: "tool.execution.failed"; callId: string; name: string; error: string }
```

Later, `run_command` can emit:

```ts
| {
    type: "tool.execution.output";
    callId: string;
    name: "run_command";
    stream: "stdout" | "stderr";
    chunk: string;
  }
```

## Pi's Subscribe Method Versus Tinyloop's Async Generator

Tinyloop currently exposes:

```ts
events(): AsyncGenerator<AgentEvent>
```

Consumers use:

```ts
for await (const event of session.events()) {
  render(event);
}
```

Pi exposes:

```ts
subscribe(listener: (event: AgentSessionEvent) => void): () => void
```

Consumers use:

```ts
const unsubscribe = session.subscribe((event) => {
  render(event);
});
```

The difference is not that one is correct and the other is wrong. They fit different consumption styles.

An async generator is natural for stream-like adapters:

- CLI loops
- JSON-lines output
- server-sent events
- tests that want to collect events until a terminal event appears

A subscribe method is natural for in-process observers:

- persistence
- extension systems
- multiple UI components
- status bars
- metrics collectors

Pi's `Agent` also awaits async listeners. That gives it stronger lifecycle semantics: the run is not considered fully settled until important event listeners finish. That matters for persistence and extension hooks.

Tinyloop does not need that immediately. It can keep the async generator while adding a simple `subscribe()` later if multiple in-process observers become useful.

## Recommended Tinyloop Design

Do this in small steps.

### 1. Extend AgentEvent

Add tool lifecycle events to `event.ts`.

Start narrow:

```ts
export type AgentEvent =
  | { type: "turn.started" }
  | { type: "turn.completed" }
  | { type: "turn.failed"; error?: string }
  | { type: "assistant.message"; text: string }
  | {
      type: "tool.execution.started";
      callId: string;
      name: string;
      args: Record<string, unknown>;
    }
  | {
      type: "tool.execution.completed";
      callId: string;
      name: string;
      output: string;
    }
  | {
      type: "tool.execution.failed";
      callId: string;
      name: string;
      error: string;
    };
```

Use `callId` from the model's tool call ID. That gives the UI a stable key.

### 2. Define AgentEventSink

Put the type near `AgentEvent`:

```ts
export type AgentEventSink = (event: AgentEvent) => void | Promise<void>;
```

Keep this type small. It should not know about sessions, sequence numbers, replay, or transports.

### 3. Thread The Sink Into Agent.runOneUserTurn

Change:

```ts
async runOneUserTurn(userInput: string): Promise<string>
```

to:

```ts
async runOneUserTurn(
  userInput: string,
  options: { emit?: AgentEventSink } = {},
): Promise<string>
```

Inside the method:

```ts
const emit = options.emit ?? (() => {});
```

Then pass it into tool execution:

```ts
turnInput = await runToolCalls(this.tools, toolCalls, emit);
```

### 4. Thread The Sink Into runToolCalls And handleToolCall

Change:

```ts
runToolCalls(tools, toolCalls)
handleToolCall(tools, toolCall)
```

to:

```ts
runToolCalls(tools, toolCalls, emit)
handleToolCall(tools, toolCall, emit)
```

Then emit at the tool boundary:

```ts
const args = parseToolArgs(toolCall.arguments);

await emit({
  type: "tool.execution.started",
  callId: toolCall.call_id,
  name: toolCall.name,
  args,
});

try {
  const output = await tool.run(args);

  await emit({
    type: "tool.execution.completed",
    callId: toolCall.call_id,
    name: toolCall.name,
    output,
  });

  return {
    type: "function_call_output",
    call_id: toolCall.call_id,
    output,
  };
} catch (error) {
  await emit({
    type: "tool.execution.failed",
    callId: toolCall.call_id,
    name: toolCall.name,
    error: error instanceof Error ? error.message : String(error),
  });

  throw error;
}
```

This boundary is the right first place because `handleToolCall()` already has:

- the tool name
- the model call ID
- the parsed arguments
- the final result or thrown error

### 5. Pass Session.emit As The Sink

In `session.ts`, replace:

```ts
const response = await this.agent.runOneUserTurn(command.text);
```

with:

```ts
const response = await this.agent.runOneUserTurn(command.text, {
  emit: (event) => this.emit(event),
});
```

Now `AgentSession` still owns the public event stream, but it receives events generated from inside the loop.

### 6. Keep EventEmitter For Now

Do not replace the current `EventEmitter` just to match Pi.

The current public API:

```ts
session.events()
```

is a good fit for the existing CLI and for future JSON/SSE streams.

A `subscribe()` method can be added later as a convenience:

```ts
subscribe(listener: (event: AgentEvent) => void): () => void {
  this.emitter.on("event", listener);
  return () => this.emitter.off("event", listener);
}
```

That can coexist with `events()`.

## Suggested Event Naming

Tinyloop currently uses dot-separated names:

- `turn.started`
- `assistant.message`
- `turn.completed`

Stay consistent with that style:

- `tool.execution.started`
- `tool.execution.output`
- `tool.execution.completed`
- `tool.execution.failed`

Pi uses underscore-separated names:

- `tool_execution_start`
- `tool_execution_update`
- `tool_execution_end`

Do not copy the exact names unless you want compatibility with Pi's stream format. The more important lesson is the lifecycle shape.

## Backpressure And Awaiting Events

The sink type allows either sync or async emission:

```ts
type AgentEventSink = (event: AgentEvent) => void | Promise<void>;
```

If the loop calls:

```ts
await emit(event);
```

then event processing can create backpressure.

That is useful when the session must persist or process an event before the loop continues.

It can also slow down the loop if rendering or transport work is done directly inside the sink.

For tinyloop's current `EventEmitter`, `this.emit(event)` is synchronous and returns immediately. That is fine. The sink is still async-compatible so a future session implementation can await persistence or extension hooks without changing the loop again.

## Replay And Stable IDs

Tool events should include `callId` immediately.

Later, session-level metadata should wrap every event with:

- `sessionId`
- `turnId`
- `sequence`
- timestamp, if useful

Do not push all of that into the low-level agent loop too early.

A practical split is:

```txt
Agent loop event
  type, callId, tool name, args, output, error

AgentSession envelope
  sessionId, turnId, sequence, timestamp
```

That keeps the loop focused on behavior and lets the session handle replay, ordering, and reconnects.

## Concrete Example Flow

For a user message that causes the model to read a file, the future event stream could look like:

```txt
turn.started
tool.execution.started
  callId: call_123
  name: read_file
  args: { path: "README.md" }
tool.execution.completed
  callId: call_123
  name: read_file
  output: "# tinyloop..."
assistant.message
  text: "The README says..."
turn.completed
```

For `run_command`, a later streaming version could look like:

```txt
turn.started
tool.execution.started
  callId: call_456
  name: run_command
  args: { command: "pnpm test" }
tool.execution.output
  callId: call_456
  stream: stdout
  chunk: "packages/agent test\n"
tool.execution.output
  callId: call_456
  stream: stderr
  chunk: "warning ...\n"
tool.execution.completed
  callId: call_456
  output: "exit_code: 0\nstdout:\n..."
assistant.message
turn.completed
```

This gives terminal and GUI adapters enough structure to render tool activity without scraping assistant text.

## Design Questions

- Should `tool.execution.failed` be followed by `turn.failed`, or should the failed tool result be sent back to the model?
- Should invalid tool calls produce `tool.execution.failed` events, or a separate `tool.execution.rejected` event?
- Should args be emitted exactly as parsed, or should sensitive fields be redacted first?
- Should large tool outputs be included in `tool.execution.completed`, or should the event contain a truncated preview plus a file path?
- Should `runToolCalls()` stay sequential, or should it eventually support parallel tool calls?
- If parallel tool calls are added, should completion events emit in completion order while final tool-result messages preserve model source order?

## What To Do Next

Implement the narrow event sink first.

Do not implement replay, sequence numbers, GUI transport, extension hooks, parallel tools, or live command output in the same change.

A good first PR would:

1. Add `AgentEventSink`.
2. Add three tool lifecycle event variants.
3. Thread the sink from `AgentSession` to `Agent.runOneUserTurn()`.
4. Emit started/completed/failed events in `handleToolCall()`.
5. Render those events in the CLI as simple bracketed lines.
6. Add a focused test or fake tool call path if the repo has tests by then.

After that lands, add streaming updates for `run_command`.

## References

- Pi JSON event stream docs: https://pi.dev/docs/latest/json
- Pi SDK docs: https://pi.dev/docs/latest/sdk
- Pi extension tool event docs: https://pi.dev/docs/latest/extensions
- Pi low-level agent loop source: https://raw.githubusercontent.com/earendil-works/pi/main/packages/agent/src/agent-loop.ts
- Pi stateful Agent source: https://raw.githubusercontent.com/earendil-works/pi/main/packages/agent/src/agent.ts
- Pi AgentSession source: https://raw.githubusercontent.com/earendil-works/pi/main/packages/coding-agent/src/core/agent-session.ts
