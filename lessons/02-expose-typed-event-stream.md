# Expose A Typed Event Stream

## Recommendation

Replace the single final-string interaction model with a typed stream of events. The agent should emit events while a turn is running, not only after it finishes.

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

Use events as the agent-to-UI contract. Keep them small, explicit, and stable.

Useful event families:

- turn lifecycle
- model lifecycle
- assistant message output
- tool lifecycle
- tool progress
- errors

Prefer a small set of well-named events over exposing raw internals everywhere.

## What To Do Next

Sketch an `AgentEvent` union type before implementing the stream. For each event, ask: "What would the CLI do with this? What would Ink do? What would the GUI do?"

Once the events feel useful in all three places, wire the existing loop to emit them.

Avoid overfitting the event names to the current OpenAI SDK. The model provider can change; your UI contract should not have to.

## Design Questions

- Should assistant text arrive as one final event or streamed deltas?
- Should tool call arguments be shown before approval?
- Should event payloads include raw SDK objects, normalized fields, or both?
- What information is safe to show in a GUI by default?

## UI Notes

Ink can render events directly into terminal regions: transcript, status bar, tool log, and diff preview.

React/Tailwind/shadcn can store the same events in state and render cards, panels, sheets, command logs, and diff viewers. The event model should not mention any of those components.
