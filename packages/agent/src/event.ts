export type AgentEventPayload =
  | { type: "turn.started" }
  | { type: "turn.completed" }
  | { type: "turn.failed"; error: string }
  | { type: "assistant.message"; text: string }
  | { type: "tool.execution.started"; name: string; callId: string; args: string }
  | { type: "tool.execution.finished"; name: string; callId: string };

export type AgentEvent = AgentEventPayload & {
  sessionId: string;
  turnId: string;
  sequence: number;
};

export type AgentEventSink = (event: AgentEventPayload) => void | Promise<void>;
