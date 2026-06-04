# Build UI Adapters, Not Agent Forks

## Recommendation

Build the CLI, Ink TUI, and React/Tailwind/shadcn GUI as adapters over the same agent session API.

## Why This Matters

If each UI gets its own agent loop, behavior will drift. One UI will handle tool errors differently, another will forget cancellation, and another will show a state that cannot actually happen elsewhere.

One agent contract keeps behavior consistent.

## Guideline

Think in layers:

- `@tinyloop/agent`: headless execution, events, commands
- CLI: minimal adapter
- Ink TUI: in-process interactive terminal app
- GUI backend: local Node process exposing the agent session
- GUI frontend: React/Tailwind/shadcn renderer consuming events and sending commands

The GUI frontend should not directly run shell commands or touch the filesystem. Keep those abilities in the local backend process.

## What To Do Next

Design the in-process API first. Use it from the CLI and later Ink.

Only after that should you introduce GUI transport. When you do, make the transport carry the same events and commands rather than inventing a second protocol.

Good first transport candidates:

- Server-Sent Events for agent-to-GUI event streaming plus HTTP for commands
- WebSocket for both events and commands

Do not choose based on novelty. Choose based on the interaction shape you actually need.

## Design Questions

- Can multiple GUI windows attach to one session?
- Should the GUI be able to replay prior events after reconnecting?
- Should events be persisted, or only kept in memory?
- Where should workspace selection happen?
- How will the GUI backend authenticate local clients, if at all?

## UI Notes

Ink is the best next UI because it can exercise the event model without adding browser transport yet.

React/Tailwind/shadcn is a good fit once the event model stabilizes. shadcn components should render decisions and structured results; they should not define agent behavior.
