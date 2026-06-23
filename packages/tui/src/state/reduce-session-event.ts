import type { UiSessionEvent } from "../session/session-driver.js";
import type { TuiState, TurnView } from "./tui-state.js";

function updateTurn(state: TuiState, turnId: string, update: (turn: TurnView) => TurnView): TurnView[] {
  return state.turns.map<TurnView>((turn) => (turn.id === turnId ? update(turn) : turn));
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
    case "assistant.message": {
      return {
        ...state,
        turns: updateTurn(state, event.turnId, (turn) => ({
          ...turn,
          items: [...turn.items, { type: "assistant", text: event.text }],
        })),
      };
    }

    case "user.message": {
      return {
        ...state,
        turns: updateTurn(state, event.turnId, (turn) => ({
          ...turn,
          items: [...turn.items, { type: "user", text: event.text }],
        })),
      };
    }
    default:
      return state;
  }
}
