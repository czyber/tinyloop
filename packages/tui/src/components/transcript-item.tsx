import { Box, Text } from "ink";
import type { TranscriptItem, TurnView } from "../state/tui-state.js";
import { AssistantMessage } from "./assistant-message.js";
import { colors } from "./theme.js";
import { ToolCard } from "./tool-card.js";

export type TranscriptItemViewProps = {
  item: TranscriptItem;
  turnStatus: TurnView["status"];
};

export function TranscriptItemView({ item, turnStatus }: TranscriptItemViewProps) {
  switch (item.type) {
    case "user":
      return (
        <MessageShell accentColor={colors.text} label="you">
          <Text>{item.text}</Text>
        </MessageShell>
      );

    case "assistant":
      return (
        <MessageShell accentColor={colors.accent} label="tinyloop">
          <AssistantMessage text={item.text} />
        </MessageShell>
      );

    case "error":
      return (
        <MessageShell accentColor={colors.danger} label="error">
          <Text color={colors.danger}>{item.text}</Text>
        </MessageShell>
      );

    case "tool":
      return <ToolCard item={item} turnStatus={turnStatus} />;
  }
}

function MessageShell({
  accentColor,
  children,
  label,
}: {
  accentColor: string;
  children: React.ReactNode;
  label: string;
}) {
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text color={accentColor}>{label}</Text>
      <Box marginLeft={2}>{children}</Box>
    </Box>
  );
}
