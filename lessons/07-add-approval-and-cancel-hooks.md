# Add Approval And Cancel Hooks

## Recommendation

Dangerous or expensive actions should pause for UI approval. Running turns should also be cancellable.

## Why This Matters

The current tools can write files, edit files, and run shell commands. A serious UI should make those actions visible and controllable.

Approval is not just a safety feature. It is also an interaction model: the user learns what the agent is about to do and can steer it.

## Guideline

The agent should request a decision by emitting an event. The UI should provide the decision by dispatching a command to the session.

Avoid hardcoding approval prompts into the agent. Emit an event that describes the requested action, then let the CLI, Ink TUI, or GUI decide how to ask the user.

The command path should be the same for every adapter:

```ts
type AgentCommand =
  | { type: "approve_tool_call"; turnId: string; callId: string }
  | { type: "deny_tool_call"; turnId: string; callId: string; reason?: string }
  | { type: "cancel_turn"; turnId: string };
```

For an in-process TUI, these commands go directly to `session.dispatch(command)`. For the GUI, the browser sends the command to the local server, and the server dispatches it to the matching session.

## What To Do Next

Start by classifying tools:

- safe by default
- visible but auto-approved
- requires approval
- never allowed in the current mode

Then design the smallest command API that can block a tool call until the UI responds and can cancel a running turn.

The flow should look like this:

```txt
adapter -> dispatch user_message -> session -> agent
agent -> emits approval.requested -> session -> adapter
adapter -> dispatch approve_tool_call or deny_tool_call -> session
session -> resolves pending approval -> agent continues
```

## Design Questions

- Should approval happen before all tool calls or only selected ones?
- Should approvals be per call, per turn, or rememberable by pattern?
- Should the user be able to edit tool arguments before approval?
- What should the agent tell the model when a user denies a tool call?
- What should happen if the user cancels while a tool process is running?
- How should the server reject commands for unknown sessions, finished turns, or stale `callId` values?

## UI Notes

Ink can present approvals as keyboard-driven prompts.

React/Tailwind/shadcn can use dialogs, sheets, or inline approval panels. Keep the decision data independent of any specific component.
