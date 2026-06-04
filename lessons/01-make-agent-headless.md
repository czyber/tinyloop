# Make The Agent Headless

## Recommendation

Keep `@tinyloop/agent` free of UI concerns. The agent should not know whether it is being driven by the current readline CLI, an Ink TUI, or a React/Tailwind/shadcn GUI.

## Why This Matters

The current CLI is thin, which is good. The risk is letting richer UI needs leak into the core loop: terminal spinners, React component state, prompt styling, keyboard shortcuts, browser transport, and confirmation dialogs.

If those concepts enter the agent package, every new UI becomes harder to build.

## Guideline

Think of the agent as an execution engine behind a stateful session API. The core agent has a small public contract:

- accept normalized commands from a session
- call the model
- run tools
- maintain model/tool state needed for the conversation
- report what happened

Do not make the agent render anything. It should report facts and decisions. The UI decides how those facts look.

## Driving A Headless Agent

Emitting events makes the agent observable, but events are only the output side of the contract. Adapters also need a command path into the running session.

The UI should drive an `AgentSession`, not random agent internals. For the CLI, that can still be as simple as reading one prompt from stdin and dispatching a user-message command:

```ts
const events = session.events();

while (true) {
  const userInput = await rl.question("> ");
  session.dispatch({ type: "user_message", text: userInput });

  for await (const event of events) {
    renderCliEvent(event);
    if (event.type === "turn.completed" || event.type === "turn.failed") {
      break;
    }
  }
}
```

The relationship should feel like this:

```txt
CLI/TUI/GUI adapter -> sends commands -> AgentSession -> Agent
Agent -> emits events -> AgentSession -> CLI/TUI/GUI adapter
```

Headless does not mean autonomous. It means the agent does not own stdin, stdout, terminal layout, React state, or browser transport.

For the first version, `dispatch({ type: "user_message", text })` and `events()` can be enough. The caller gives the session one user message and consumes events until the turn finishes.

Some interactions need commands while a turn is already running. For example, the agent may emit an approval request before running a shell command. The UI then dispatches an approval or denial command, and the agent continues.

Do not let every adapter invent its own control API. The CLI, Ink TUI, and GUI server should all send the same `AgentCommand` values to the same session abstraction.

## What To Do Next

Start by identifying which parts of `main.ts` are UI-only. Readline input, prompt display, and `console.log` output belong outside the core agent.

Then introduce the session-level API that the richer adapters will use:

- `session.dispatch(command)` for user messages, approvals, denials, and cancellation
- `session.events()` or an equivalent subscription API for typed events
- `session.snapshot()` for current state needed by adapters

## Design Questions

- What state belongs inside an agent session?
- What state belongs only in a UI?
- Should one session represent one workspace, one conversation, or one process?
- How much of the OpenAI response object should leak through the public API?
- Which commands are accepted while a turn is idle versus running?
- When the agent pauses for approval, where should that pending state live?

## UI Notes

The Ink TUI can run the session and agent in-process. The React/Tailwind/shadcn GUI should talk to a local Node server that owns sessions instead of importing filesystem and shell-capable code directly into the browser.
