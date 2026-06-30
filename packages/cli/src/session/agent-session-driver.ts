import { Agent, type AgentOptions, AgentSession } from "tinyloop-agent";
import type { SessionDriver } from "tinyloop-tui";

import { toUiSessionEvent } from "./agent-event-normalizer.js";

export type AgentSessionDriverOptions = Omit<AgentOptions, "workspaceRoot">;

export function createAgentSessionDriver(
  workspaceRoot: string,
  options: AgentSessionDriverOptions = {},
): SessionDriver {
  const session = new AgentSession(new Agent({ ...options, workspaceRoot }));

  return {
    sendUserMessage: (text) => session.dispatch({ type: "user_message", text }),
    async *events() {
      for await (const event of session.events()) {
        yield toUiSessionEvent(event);
      }
    },
  };
}
