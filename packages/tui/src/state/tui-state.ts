export type TranscriptItem =
  | { type: "user"; text: string; sequence: number }
  | { type: "assistant"; text: string; sequence: number }
  | {
      type: "tool";
      callId: string;
      name: string;
      status: "running" | "completed";
      args: string;
      output: string;
      details?: unknown;
      sequence: number;
    }
  | { type: "error"; text: string; sequence: number };

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

export const initialTuiState: TuiState = {
  status: "idle",
  turns: [],
};
