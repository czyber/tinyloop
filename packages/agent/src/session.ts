import EventEmitter, { on } from "node:events";
import type { Agent } from "./agent";
import type { AgentEvent } from "./event";

export type CommandType = "user_message" | "tool_call";

export type Command = {
  type: CommandType;
  text: string;
};

type SessionEventMap = {
  event: [AgentEvent];
};

export class AgentSession {
  private agent: Agent;
  private emitter: EventEmitter<SessionEventMap>;

  constructor(agent: Agent) {
    this.agent = agent;
    this.emitter = new EventEmitter<SessionEventMap>();
  }

  private emit(event: AgentEvent): void {
    this.emitter.emit("event", event);
  }

  async dispatch(command: Command): Promise<void> {
    this.emit({ type: "turn.started" });
    if (command.type === "user_message") {
      try {
        const response = await this.agent.runOneUserTurn(command.text, {
          emit: (event: AgentEvent) => this.emit(event),
        });
        this.emit({ type: "assistant.message", text: response });
        this.emit({ type: "turn.completed" });
      } catch (error) {
        this.emit({ type: "turn.failed", error: error instanceof Error ? error.message : String(error) });
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
