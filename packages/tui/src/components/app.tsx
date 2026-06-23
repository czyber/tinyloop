import { useEffect, useState } from "react";
import type { SessionDriver } from "../session/session-driver.js";
import { reduceSessionEvent } from "../state/reduce-session-event.js";
import { initialTuiState } from "../state/tui-state.js";
import { StatusBar } from "./status-bar.js";
import { Transcript } from "./transcript.js";

export type AppProps = {
  sessionDriver: SessionDriver;
};

export function App({ sessionDriver }: AppProps) {
  const [state, setState] = useState(initialTuiState);

  useEffect(() => {
    let isMounted = true;

    async function consumeEvents() {
      for await (const event of sessionDriver.events()) {
        if (!isMounted) {
          return;
        }

        setState((currentState) => reduceSessionEvent(currentState, event));
      }
    }

    consumeEvents().catch(console.error);

    return () => {
      isMounted = false;
    };
  }, [sessionDriver]);

  return (
    <>
      <StatusBar status={state.status} />
      <Transcript turns={state.turns} />
    </>
  );
}
