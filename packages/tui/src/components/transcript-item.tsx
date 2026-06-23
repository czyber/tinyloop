import { Text } from "ink";
import type { TranscriptItem } from "../state/tui-state.js";

export type TranscriptItemViewProps = {
  item: TranscriptItem;
};

export function TranscriptItemView({ item }: TranscriptItemViewProps) {
  switch (item.type) {
    case "user":
      return (
        <Text>
          <Text color="cyan">you</Text>
          <Text dimColor>: </Text>
          {item.text}
        </Text>
      );

    case "assistant":
      return (
        <Text>
          <Text color="green">tinyloop</Text>
          <Text dimColor>: </Text>
          {item.text}
        </Text>
      );

    case "error":
      return (
        <Text>
          <Text color="red">error</Text>
          <Text dimColor>: </Text>
          {item.text}
        </Text>
      );

    case "tool":
      return (
        <Text dimColor={item.status === "completed"}>
          tool: {item.name} {item.status} {item.args}
          {item.output.length > 0 ? `\n${item.output.trimEnd()}` : ""}
        </Text>
      );
  }
}
