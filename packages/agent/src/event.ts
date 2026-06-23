import type { ToolDetailsByName, ToolName } from "./tools/registry";

export type ToolProgressByName = {
  run_command: string;
};

export type ToolExecutionProgressEvent = {
  [Name in keyof ToolProgressByName]: {
    type: "tool.execution.progress";
    name: string;
    callId: string;
    progress: ToolProgressByName[Name];
  };
}[keyof ToolProgressByName];

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
  | { type: "user.message"; text: string }
  | { type: "assistant.message"; text: string }
  | { type: "tool.execution.started"; name: string; callId: string; args: string }
  | ToolExecutionProgressEvent
  | ToolFinishedEvent;

export type AgentEvent = AgentEventPayload & {
  sessionId: string;
  turnId: string;
  sequence: number;
};

export type AgentEventSink = (event: AgentEventPayload) => void | Promise<void>;
