import { createFakeSessionDriver } from "./session/fake-session-driver.js";
import { reduceSessionEvent } from "./state/reduce-session-event.js";
import { initialTuiState } from "./state/tui-state.js";

const sessionDriver = createFakeSessionDriver({
  events: [
    { type: "turn.started", turnId: "t-1", sessionId: "s-1", sequence: 1 },
    { type: "user.message", turnId: "t-1", sessionId: "s-1", sequence: 2, text: "Hello" },
    { type: "assistant.message", turnId: "t-1", sessionId: "s-1", sequence: 3, text: "Hello! How can I help?" },
    { type: "turn.completed", turnId: "t-1", sessionId: "s-1", sequence: 4 },
  ],
});
let finalState = initialTuiState;

for await (const event of sessionDriver.events()) {
  finalState = reduceSessionEvent(finalState, event);
}

console.log(JSON.stringify(finalState, null, 2));
