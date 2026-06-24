import assert from "node:assert/strict";
import type { UiSessionEvent } from "../src/session/session-driver.js";
import { reduceSessionEvent } from "../src/state/reduce-session-event.js";
import { initialTuiState } from "../src/state/tui-state.js";

const events: UiSessionEvent[] = [
  { type: "turn.started", sessionId: "s-1", turnId: "t-1", sequence: 1 },
  { type: "user.message", sessionId: "s-1", turnId: "t-1", sequence: 2, text: "List files" },
  {
    type: "tool.started",
    sessionId: "s-1",
    turnId: "t-1",
    sequence: 3,
    callId: "call-1",
    name: "run_command",
    args: JSON.stringify({ command: "ls" }),
  },
  {
    type: "tool.progress",
    sessionId: "s-1",
    turnId: "t-1",
    sequence: 4,
    callId: "call-1",
    name: "run_command",
    text: "README.md\n",
  },
  {
    type: "tool.finished",
    sessionId: "s-1",
    turnId: "t-1",
    sequence: 5,
    callId: "call-1",
    name: "run_command",
    output: "exit_code: 0\nstdout:\nREADME.md\n\nstderr:\n",
    details: { command: "ls", stdout: "README.md\n", stderr: "", exitCode: 0 },
  },
  { type: "assistant.message", sessionId: "s-1", turnId: "t-1", sequence: 6, text: "I found README.md." },
  { type: "turn.completed", sessionId: "s-1", turnId: "t-1", sequence: 7 },
];

const finalState = events.reduce(reduceSessionEvent, initialTuiState);

assert.equal(finalState.status, "idle");
assert.equal(finalState.activeTurnId, undefined);
assert.equal(finalState.turns.length, 1);
assert.equal(finalState.turns[0]?.status, "completed");
assert.deepEqual(
  finalState.turns[0]?.items.map((item) => item.type),
  ["user", "tool", "assistant"],
);
assert.equal(finalState.turns[0]?.items[1]?.type, "tool");

if (finalState.turns[0]?.items[1]?.type === "tool") {
  assert.equal(finalState.turns[0].items[1].status, "completed");
  assert.equal(finalState.turns[0].items[1].output, "README.md\n");
}
