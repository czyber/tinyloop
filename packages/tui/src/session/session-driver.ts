export type UiSessionEvent =
  | (UiSessionEventMeta & { type: "turn.started" })
  | (UiSessionEventMeta & { type: "turn.completed" })
  | (UiSessionEventMeta & { type: "turn.failed"; error: string })
  | (UiSessionEventMeta & { type: "assistant.message"; text: string })
  | (UiSessionEventMeta & {
      type: "tool.started";
      callId: string;
      name: string;
      args: string;
    })
  | (UiSessionEventMeta & {
      type: "tool.progress";
      callId: string;
      name: string;
      text: string;
    })
  | (UiSessionEventMeta & {
      type: "tool.finished";
      callId: string;
      name: string;
      details: unknown;
    });

export type UiSessionEventMeta = {
  sessionId: string;
  turnId: string;
  sequence: number;
};

export type SessionDriver = {
  sendUserMessage(text: string): Promise<void>;
  events(): AsyncIterable<UiSessionEvent>;
};
