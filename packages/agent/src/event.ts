import type { ToolDetailsByName, ToolName } from "./tools/registry";

export type ToolFinishedEvent = {
  [Name in ToolName]: {
    type: "tool.execution.finished";
    name: Name;
    callId: string;
    details: ToolDetailsByName[Name];
  };
}[ToolName];
export type AgentEventPayload =
  | { type: "turn.started" }
  | { type: "turn.completed" }
  | { type: "turn.failed"; error: string }
  | { type: "assistant.message"; text: string }
  | { type: "tool.execution.started"; name: string; callId: string; args: string }
  | ToolFinishedEvent;

export type AgentEvent = AgentEventPayload & {
  sessionId: string;
  turnId: string;
  sequence: number;
};

export type AgentEventSink = (event: AgentEventPayload) => void | Promise<void>;
