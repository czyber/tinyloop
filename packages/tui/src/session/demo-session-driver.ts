import type { SessionDriver, UiSessionEvent } from "./session-driver.js";

const DEMO_SESSION_ID = "demo-session";

export function createDemoSessionDriver(): SessionDriver {
  const queue = createEventQueue<UiSessionEvent>();
  let turnNumber = 0;
  let sequence = 0;

  function nextMeta(turnId: string) {
    return {
      sessionId: DEMO_SESSION_ID,
      turnId,
      sequence: ++sequence,
    };
  }

  function emit(event: UiSessionEvent) {
    queue.push(event);
  }

  return {
    async sendUserMessage(text) {
      const turnId = `demo-turn-${++turnNumber}`;
      const callId = `demo-call-${turnNumber}`;
      const command = "echo demo mode";

      emit({ ...nextMeta(turnId), type: "turn.started" });
      emit({ ...nextMeta(turnId), type: "user.message", text });
      await sleep(150);

      emit({
        ...nextMeta(turnId),
        type: "tool.started",
        callId,
        name: "run_command",
        args: JSON.stringify({ command }),
      });
      await sleep(150);

      emit({
        ...nextMeta(turnId),
        type: "tool.progress",
        callId,
        name: "run_command",
        text: "demo mode\n",
      });
      await sleep(150);

      emit({
        ...nextMeta(turnId),
        type: "tool.finished",
        callId,
        name: "run_command",
        details: {
          command,
          stdout: "demo mode\n",
          stderr: "",
          exitCode: 0,
        },
      });
      await sleep(150);

      emit({
        ...nextMeta(turnId),
        type: "assistant.message",
        text: [
          `Demo response: I received "${text}".`,
          "",
          "This transcript came from the same event reducer the real agent uses.",
          "",
          "```ts",
          "setState((state) => reduceSessionEvent(state, event));",
          "```",
          "",
          "```diff",
          "+ session events become view state",
          "- Ink components calling agent internals directly",
          "```",
        ].join("\n"),
      });
      emit({ ...nextMeta(turnId), type: "turn.completed" });
    },
    events() {
      return queue.events();
    },
  };
}

function createEventQueue<T>() {
  const pendingEvents: T[] = [];
  const pendingResolvers: Array<(event: T) => void> = [];

  return {
    push(event: T) {
      const resolve = pendingResolvers.shift();
      if (resolve) {
        resolve(event);
        return;
      }

      pendingEvents.push(event);
    },
    async *events(): AsyncIterable<T> {
      while (true) {
        if (pendingEvents.length > 0) {
          yield pendingEvents.shift() as T;
          continue;
        }

        yield await new Promise<T>((resolve) => {
          pendingResolvers.push(resolve);
        });
      }
    },
  };
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}
