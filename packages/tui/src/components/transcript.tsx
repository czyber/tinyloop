import type { TurnView } from "../state/tui-state.js";
import { TranscriptItemView } from "./transcript-item.js";

export type TranscriptProps = {
  turns: TurnView[];
};

export function Transcript({ turns }: TranscriptProps) {
  return (
    <>
      {turns.flatMap((turn) =>
        turn.items.map((item) => <TranscriptItemView key={`${turn.id}-${item.sequence}`} item={item} />),
      )}
    </>
  );
}
