# Expose A Typed Event Stream

## Recommendation

Replace the single final-string interaction model with a typed stream of events. The session should expose events while a turn is running, not only after it finishes.

## Why This Matters

A professional TUI or GUI needs to show progress:

- model request started
- tool call requested
- tool call running
- command output arriving
- file diff available
- final assistant answer
- failure state

If the UI only receives final text, it has to guess what happened. That leads to fragile rendering and makes debugging harder.

## Guideline

Use events as the agent-to-adapter contract. Keep them small, explicit, and stable.

Useful event families:

- session lifecycle
- turn lifecycle
- model lifecycle
- assistant message output
- tool lifecycle
- tool progress
- approval lifecycle
- errors

Prefer a small set of well-named events over exposing raw internals everywhere.

Events are output only. Pair them with an explicit command contract for input:

```ts
type AgentCommand =
  | { type: "user_message"; text: string }
  | { type: "approve_tool_call"; turnId: string; callId: string }
  | { type: "deny_tool_call"; turnId: string; callId: string; reason?: string }
  | { type: "cancel_turn"; turnId: string };
```

The TUI can call `session.dispatch(command)` directly. The GUI can send the same command shape through the local server.

## What To Do Next

Sketch `AgentEvent` and `AgentCommand` union types before implementing the stream. For each event, ask: "What would the CLI do with this? What would Ink do? What would the GUI do?" For each command, ask: "Can this be sent by both an in-process TUI and a browser GUI through the server?"

Once the events feel useful in all three places, wire the existing loop to emit them.

Avoid overfitting the event names to the current OpenAI SDK. The model provider can change; your UI contract should not have to.

## Design Questions

- Should assistant text arrive as one final event or streamed deltas?
- Should tool call arguments be shown before approval?
- Should event payloads include raw SDK objects, normalized fields, or both?
- What information is safe to show in a GUI by default?
- Which events should be replayable after reconnect, and which are only live notifications?
- Should command acknowledgements be events, HTTP responses, or both?

## UI Notes

Ink can render events directly into terminal regions: transcript, status bar, tool log, and diff preview.

React/Tailwind/shadcn can store the same events in state and render cards, panels, sheets, command logs, and diff viewers. The event model should not mention any of those components.
