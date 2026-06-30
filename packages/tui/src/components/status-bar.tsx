import { Box, Text } from "ink";
import type { TuiState } from "../state/tui-state.js";
import { colors, statusColor } from "./theme.js";

export type StatusBarProps = {
  mode: "agent" | "demo";
  status: TuiState["status"];
  turnCount: number;
};

export function StatusBar({ mode, status, turnCount }: StatusBarProps) {
  return (
    <Box flexDirection="column">
      <Text>
        <Text color={colors.text} bold>
          tinyloop
        </Text>
        <Text color={colors.subtle}> </Text>
        <Text color={mode === "demo" ? colors.warning : colors.accent}>{mode}</Text>
        <Text color={colors.subtle}> · </Text>
        <Text color={statusColor(status)}>{status}</Text>
        <Text color={colors.subtle}> · </Text>
        <Text color={colors.muted}>{turnCount}</Text>
        <Text color={colors.subtle}> {turnCount === 1 ? "turn" : "turns"}</Text>
      </Text>
      <Text color={colors.rule}>{"─".repeat(72)}</Text>
    </Box>
  );
}
