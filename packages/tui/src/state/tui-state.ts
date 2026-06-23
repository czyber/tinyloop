export type TranscriptItem =
  | { type: "user"; text: string }
  | { type: "assistant"; text: string }
  | {
      type: "tool";
      callId: string;
      name: string;
      status: "running" | "completed";
      args: string;
      output: string;
      details?: unknown;
    }
  | { type: "error"; text: string };

export type TurnView = {
  id: string;
  status: "running" | "completed" | "failed";
  items: TranscriptItem[];
};

export type TuiState = {
  status: "idle" | "running" | "failed";
  turns: TurnView[];
  activeTurnId?: string;
  error?: string;
};
