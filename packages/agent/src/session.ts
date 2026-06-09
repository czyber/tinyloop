import { randomUUID } from "node:crypto";
import EventEmitter, { on } from "node:events";
import type { Agent } from "./agent";
import type { AgentEvent, AgentEventPayload } from "./event";

export type CommandType = "user_message" | "tool_call";

// Later this will become a discriminated union for other commands s.a. type: "cancel_turn", turnId?: string
export type AgentCommand = {
  type: CommandType;
  text: string;
};

type SessionEventMap = {
  event: [AgentEventPayload];
};

export class AgentSession {
  private agent: Agent;
  private sessionId: string;
  private sequence = 0;
  private emitter: EventEmitter<SessionEventMap>;

  constructor(agent: Agent) {
    this.agent = agent;
    this.sessionId = randomUUID();
    this.emitter = new EventEmitter<SessionEventMap>();
  }

  private emit(event: AgentEventPayload): void {
    this.emitter.emit("event", event);
  }

  private emitForTurn(turnId: string, payload: AgentEventPayload): void {
    const event: AgentEvent = {
      ...payload,
      sessionId: this.sessionId,
      turnId,
      sequence: ++this.sequence,
    };
    this.emitter.emit("event", event);
  }

  async dispatch(command: AgentCommand): Promise<void> {
    const turnId = randomUUID();
    this.emitForTurn(turnId, { type: "turn.started" });
    if (command.type === "user_message") {
      try {
        const response = await this.agent.runOneUserTurn(command.text, {
          emit: (event: AgentEventPayload) => this.emitForTurn(turnId, event),
        });
        this.emitForTurn(turnId, { type: "assistant.message", text: response });
        this.emitForTurn(turnId, { type: "turn.completed" });
      } catch (error) {
        this.emitForTurn(turnId, {
          type: "turn.failed",
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  events(): AsyncGenerator<AgentEvent> {
    const iterator = on(this.emitter, "event");
    return (async function* () {
      for await (const [event] of iterator) {
        yield event as AgentEvent;
      }
    })();
  }
}
