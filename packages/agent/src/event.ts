export type AgentEvent =
  | { type: "turn.started" }
  | { type: "turn.completed" }
  | { type: "turn.failed"; error: string }
  | { type: "assistant.message"; text: string }
  | { type: "tool.execution.started"; name: string };

export type AgentEventSink = (event: AgentEvent) => void | Promise<void>;
