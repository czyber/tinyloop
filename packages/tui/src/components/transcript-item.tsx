import { Text } from "ink";
import type { TranscriptItem } from "../state/tui-state.js";
import { AssistantMessage } from "./assistant-message.js";
import { ToolCard } from "./tool-card.js";

export type TranscriptItemViewProps = {
  item: TranscriptItem;
};

export function TranscriptItemView({ item }: TranscriptItemViewProps) {
  switch (item.type) {
    case "user":
      return (
        <Text>
          <Text color="cyan">you</Text>
          <Text dimColor> › </Text>
          {item.text}
        </Text>
      );

    case "assistant":
      return (
        <>
          <Text>
            <Text color="green">tinyloop</Text>
            <Text dimColor> ›</Text>
          </Text>
          <AssistantMessage text={item.text} />
        </>
      );

    case "error":
      return (
        <Text>
          <Text color="red">error</Text>
          <Text dimColor> › </Text>
          {item.text}
        </Text>
      );

    case "tool":
      return <ToolCard item={item} />;
  }
}
