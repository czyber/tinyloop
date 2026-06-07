export type AgentEvent = 
    | { type: "turn.started"; }
    | { type: "turn.completed"; }
    | { type: "turn.failed"; error: string; }
    | { type: "assistant.message"; text: string };
