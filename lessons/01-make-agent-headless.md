# Make The Agent Headless

## Recommendation

Keep `@tinyloop/agent` free of UI concerns. The agent should not know whether it is being driven by the current readline CLI, an Ink TUI, or a React/Tailwind/shadcn GUI.

## Why This Matters

The current CLI is thin, which is good. The risk is letting richer UI needs leak into the core loop: terminal spinners, React component state, prompt styling, keyboard shortcuts, browser transport, and confirmation dialogs.

If those concepts enter the agent package, every new UI becomes harder to build.

## Guideline

Think of the agent as an execution engine with a small public contract:

- accept user input
- call the model
- run tools
- maintain conversation state
- report what happened

Do not make the agent render anything. It should report facts and decisions. The UI decides how those facts look.

## Driving A Headless Agent

Emitting events makes the agent observable, but events are only the output side of the contract.

The UI still drives the agent by sending input into it. For the CLI, that can be as simple as reading one prompt from stdin and passing it into a turn runner:

```ts
while (true) {
  const userInput = await rl.question("> ");

  for await (const event of agent.runTurn({ text: userInput })) {
    renderCliEvent(event);
  }
}
```

The relationship should feel like this:

```txt
CLI/TUI/GUI -> sends input or commands -> agent
agent -> emits events -> CLI/TUI/GUI
```

Headless does not mean autonomous. It means the agent does not own stdin, stdout, terminal layout, React state, or browser transport.

For the first version, `runTurn()` can be enough. The caller gives the agent one user message and consumes events until the turn finishes.

Later, some interactions will need a second command path. For example, the agent may emit an approval request before running a shell command. The UI then responds with an approval or denial, and the agent continues.

Do not solve the full command path immediately. First make the existing CLI work through the same event stream that Ink will eventually consume.

## What To Do Next

Start by identifying which parts of `main.ts` are UI-only. Readline input, prompt display, and `console.log` output belong outside the core agent.

Then decide what the agent should expose instead of `runOneUserTurn(): Promise<string>`.

Do not redesign everything yet. The first milestone is simply: the existing CLI still works, but it consumes the same headless API that a future Ink TUI would consume.

## Design Questions

- What state belongs inside an agent session?
- What state belongs only in a UI?
- Should one session represent one workspace, one conversation, or one process?
- How much of the OpenAI response object should leak through the public API?
- Is `runTurn(input)` enough for now, or do you already need a separate command API?
- When the agent pauses for approval later, where should that pending state live?

## UI Notes

The Ink TUI can run the agent in-process. The React/Tailwind/shadcn GUI should probably talk to a local Node process instead of importing filesystem and shell-capable code directly into the browser.
