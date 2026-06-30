import { Box } from "ink";
import { useEffect, useState } from "react";
import type { SessionDriver } from "../session/session-driver.js";
import { reduceSessionEvent } from "../state/reduce-session-event.js";
import { initialTuiState } from "../state/tui-state.js";
import { PromptInput } from "./prompt-input.js";
import { StatusBar } from "./status-bar.js";
import { Transcript } from "./transcript.js";

export type AppProps = {
  mode: "agent" | "demo";
  sessionDriver: SessionDriver;
};

export function App({ mode, sessionDriver }: AppProps) {
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
    <Box flexDirection="column" paddingX={1}>
      <StatusBar mode={mode} status={state.status} turnCount={state.turns.length} />
      <Box flexDirection="column" marginY={1} minHeight={1}>
        <Transcript turns={state.turns} />
      </Box>
      <PromptInput disabled={state.status === "running"} onSubmit={(text) => sessionDriver.sendUserMessage(text)} />
    </Box>
  );
}
