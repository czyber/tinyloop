# tinyloop

tinyloop is a minimal starting point for a tool-using coding agent.

It is intentionally small:

- the repo is a pnpm workspace
- the agent lives in `packages/agent`
- the agent loop calls the model, runs tool calls, then sends tool outputs back
- the default tool set has `read_file`, `write_file`, `edit_file`, and `run_command`

## Setup

```sh
pnpm install
cp .env.example .env
```

Set `OPENAI_API_KEY` in `.env`.

## Run

Start the agent from the workspace you want it to operate on:

```sh
pnpm start
```

The root `start` script runs `@tinyloop/agent`.

## Package

- `packages/agent/src/agent.ts`: model-tool loop
- `packages/agent/src/main.ts`: command-line prompt
- `packages/agent/src/tools`: four default tools

This is not a sandboxed production agent. `write_file`, `edit_file`, and `run_command` can change the current workspace.
