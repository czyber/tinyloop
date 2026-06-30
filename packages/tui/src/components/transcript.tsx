import { Box, Text } from "ink";
import type { TurnView } from "../state/tui-state.js";
import { colors } from "./theme.js";
import { TranscriptItemView } from "./transcript-item.js";

export type TranscriptProps = {
  turns: TurnView[];
};

export function Transcript({ turns }: TranscriptProps) {
  if (turns.length === 0) {
    return (
      <Box flexDirection="column">
        <Text color={colors.muted}>Waiting for input.</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      {turns.map((turn, index) => (
        <Box flexDirection="column" key={turn.id} marginBottom={1}>
          {index > 0 ? <TurnDivider number={index + 1} status={turn.status} /> : null}
          {turn.items.map((item) => (
            <TranscriptItemView key={`${turn.id}-${item.sequence}`} item={item} turnStatus={turn.status} />
          ))}
        </Box>
      ))}
    </Box>
  );
}

function TurnDivider({ number, status }: { number: number; status: TurnView["status"] }) {
  const statusLabel = status === "completed" ? "" : ` · ${status}`;

  return (
    <Box marginBottom={1}>
      <Text color={colors.rule}>{"─".repeat(24)}</Text>
      <Text color={colors.subtle}>
        {" "}
        turn {number}
        {statusLabel}{" "}
      </Text>
      <Text color={colors.rule}>{"─".repeat(24)}</Text>
    </Box>
  );
}
