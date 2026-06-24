import { Box, Text } from "ink";
import type { TurnView } from "../state/tui-state.js";
import { TranscriptItemView } from "./transcript-item.js";

export type TranscriptProps = {
  turns: TurnView[];
};

export function Transcript({ turns }: TranscriptProps) {
  if (turns.length === 0) {
    return <Text dimColor>No messages yet. Ask tinyloop something.</Text>;
  }

  return (
    <Box flexDirection="column">
      {turns.flatMap((turn) =>
        turn.items.map((item) => <TranscriptItemView key={`${turn.id}-${item.sequence}`} item={item} />),
      )}
    </Box>
  );
}
