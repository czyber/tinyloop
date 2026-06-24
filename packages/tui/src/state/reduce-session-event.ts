import type { UiSessionEvent } from "../session/session-driver.js";
import type { TranscriptItem, TuiState, TurnView } from "./tui-state.js";

function updateTurn(state: TuiState, turnId: string, update: (turn: TurnView) => TurnView): TurnView[] {
  return state.turns.map<TurnView>((turn) => (turn.id === turnId ? update(turn) : turn));
}

function updateToolItem(
  turn: TurnView,
  callId: string,
  update: (tool: Extract<TranscriptItem, { type: "tool" }>) => TranscriptItem,
): TurnView {
  return {
    ...turn,
    items: turn.items.map((item) => (item.type === "tool" && item.callId === callId ? update(item) : item)),
  };
}

export function reduceSessionEvent(state: TuiState, event: UiSessionEvent): TuiState {
  switch (event.type) {
    case "turn.started": {
      const turnAlreadyExists = state.turns.some((turn) => turn.id === event.turnId);
      const newTurn: TurnView = {
        id: event.turnId,
        status: "running",
        items: [],
      };
      return {
        activeTurnId: event.turnId,
        error: undefined,
        status: "running",
        turns: turnAlreadyExists ? state.turns : [...state.turns, newTurn],
      };
    }

    case "turn.completed": {
      const updatedTurns = state.turns.map<TurnView>((turn) =>
        turn.id === event.turnId ? { ...turn, status: "completed" } : turn,
      );

      return {
        activeTurnId: state.activeTurnId === event.turnId ? undefined : state.activeTurnId,
        error: undefined,
        status: "idle",
        turns: updatedTurns,
      };
    }

    case "turn.failed": {
      return {
        ...state,
        activeTurnId: state.activeTurnId === event.turnId ? undefined : state.activeTurnId,
        error: event.error,
        status: "failed",
        turns: updateTurn(state, event.turnId, (turn) => ({
          ...turn,
          status: "failed",
          items: [...turn.items, { type: "error", text: event.error, sequence: event.sequence }],
        })),
      };
    }

    case "assistant.message": {
      return {
        ...state,
        turns: updateTurn(state, event.turnId, (turn) => ({
          ...turn,
          items: [...turn.items, { type: "assistant", text: event.text, sequence: event.sequence }],
        })),
      };
    }

    case "user.message": {
      return {
        ...state,
        turns: updateTurn(state, event.turnId, (turn) => ({
          ...turn,
          items: [...turn.items, { type: "user", text: event.text, sequence: event.sequence }],
        })),
      };
    }

    case "tool.started": {
      return {
        ...state,
        turns: updateTurn(state, event.turnId, (turn) => ({
          ...turn,
          items: [
            ...turn.items,
            {
              type: "tool",
              callId: event.callId,
              name: event.name,
              status: "running",
              args: event.args,
              output: "",
              sequence: event.sequence,
            },
          ],
        })),
      };
    }

    case "tool.progress": {
      return {
        ...state,
        turns: updateTurn(state, event.turnId, (turn) =>
          updateToolItem(turn, event.callId, (tool) => ({
            ...tool,
            output: `${tool.output}${event.text}`,
          })),
        ),
      };
    }

    case "tool.finished": {
      return {
        ...state,
        turns: updateTurn(state, event.turnId, (turn) =>
          updateToolItem(turn, event.callId, (tool) => ({
            ...tool,
            status: "completed",
            output: tool.output.length > 0 ? tool.output : event.output,
            details: event.details,
          })),
        ),
      };
    }

    default:
      return state;
  }
}
