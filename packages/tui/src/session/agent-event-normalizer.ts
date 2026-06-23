import type { AgentEvent } from "@tinyloop/agent";

import type { UiSessionEvent, UiSessionEventMeta } from "./session-driver.js";

export function toUiSessionEvent(event: AgentEvent): UiSessionEvent {
  const meta = toUiSessionEventMeta(event);

  switch (event.type) {
    case "turn.started":
    case "turn.completed":
      return { ...meta, type: event.type };

    case "turn.failed":
      return { ...meta, type: event.type, error: event.error };

    case "assistant.message":
      return { ...meta, type: event.type, text: event.text };

    case "tool.execution.started":
      return {
        ...meta,
        type: "tool.started",
        callId: event.callId,
        name: event.name,
        args: event.args,
      };

    case "tool.execution.progress":
      return {
        ...meta,
        type: "tool.progress",
        callId: event.callId,
        name: event.name,
        text: event.progress,
      };

    case "tool.execution.finished":
      return {
        ...meta,
        type: "tool.finished",
        callId: event.callId,
        name: event.name,
        details: event.details,
      };
    default:
      throw new Error(`Unknown event type ${event.type}`);
  }
}

function toUiSessionEventMeta(event: AgentEvent): UiSessionEventMeta {
  return {
    sessionId: event.sessionId,
    turnId: event.turnId,
    sequence: event.sequence,
  };
}
