# tinyloop

tinyloop is a tiny coding agent, I originally created to learn about how to build such a system in a pragmatic manner.

It is by design minimalistic and not a production ready agent. While I plan to implement advanced features and eventually grow it into a small, usable agent - it won't replace existing coding agents s.a. Pi, Codex or Claude Code.

The goal for this project is to create something usable, which is a great starting point to learn about agent intrinsics.

## Packages

- `packages/agent` contains the agent and tools - it provides a public API (via `AgentEvent`, `AgentCommand`) for consuming UIs
- `packages/tui` contains a Ink terminal UI (known from agents like Claude Code)

## Future
- `web GUI` I plan to add a web GUI that interacts with the agent over a local backend. For a rich UX, this is going to introduce more concepts, s.a. persisting sessions, into the codebase.
- `more commands` not just `user_message` but interrupts, approvals,  message queuing etc.
