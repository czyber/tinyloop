# Add Approval And Cancel Hooks

## Recommendation

Dangerous or expensive actions should pause for UI approval. Running turns should also be cancellable.

## Why This Matters

The current tools can write files, edit files, and run shell commands. A serious UI should make those actions visible and controllable.

Approval is not just a safety feature. It is also an interaction model: the user learns what the agent is about to do and can steer it.

## Guideline

The agent should request a decision. The UI should provide the decision.

Avoid hardcoding approval prompts into the agent. Emit an event that describes the requested action, then let the CLI, Ink TUI, or GUI decide how to ask the user.

## What To Do Next

Start by classifying tools:

- safe by default
- visible but auto-approved
- requires approval
- never allowed in the current mode

Then design the smallest approval API that can block a tool call until the UI responds.

## Design Questions

- Should approval happen before all tool calls or only selected ones?
- Should approvals be per call, per turn, or rememberable by pattern?
- Should the user be able to edit tool arguments before approval?
- What should the agent tell the model when a user denies a tool call?

## UI Notes

Ink can present approvals as keyboard-driven prompts.

React/Tailwind/shadcn can use dialogs, sheets, or inline approval panels. Keep the decision data independent of any specific component.
