# tinyloop

tinyloop is a tiny coding agent, I originally created to learn about how to build such a system in a pragmatic manner.

It is by design minimalistic and not a production ready agent. It is meant as an educational showcase of the moving parts inside a small coding agent: a tool-using loop, a session event stream, and a terminal UI that consumes those events without knowing too much about the agent internals.

The goal for this project is to create something usable, which is a great starting point to learn about agent intrinsics.

## Quickstart

Install dependencies:

```bash
pnpm install
```

Run the TUI in demo mode, no API key required:

```bash
pnpm demo
```

Run the real agent:

```bash
cp .env.example .env
# Set OPENAI_API_KEY in .env
pnpm start
```

Build the local CLI:

```bash
pnpm build
```

Install the local CLI globally for dogfooding:

```bash
pnpm add --global ./packages/tui
tinyloop
```

If `tinyloop` is not found after global install, run:

```bash
pnpm setup
```

Then restart your terminal.

## Packages

- `packages/agent` contains the agent loop and tools. It exposes the public session contract through `AgentEvent`, `AgentCommand`, and `AgentSession`.
- `packages/tui` contains the Ink terminal UI. It talks to the agent through a small `SessionDriver`, reduces session events into view state, and renders the transcript.

## Architecture

The important boundary is:

```text
AgentSession -> SessionDriver -> reducer -> Ink components
```

The TUI does not call tools directly and does not know about OpenAI. It consumes normalized session events:

- turn lifecycle events
- user and assistant messages
- tool start/progress/finish events
- failure events

That makes the UI easy to test with a fake or demo session driver.

## Checks

```bash
pnpm check
pnpm test
```

## Future
- `web GUI`: a local backend and browser UI, which would introduce persistence and richer session management.
- `more commands`: interrupts, approvals, message queuing, cancellation, and steering.
- `session persistence`: save and resume transcripts.
