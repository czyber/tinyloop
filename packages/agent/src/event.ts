export type AgentEvent = 
    | { type: "turn.started"; }
    | { type: "turn.completed"; }
    | { type: "turn.failed"; }
    | { type: "assistant.message"; text: string };
