import { Text } from "ink";
import type { TuiState } from "../state/tui-state.js";

export type StatusBarProps = {
  status: TuiState["status"];
};

export function StatusBar({ status }: StatusBarProps) {
  return (
    <Text>
      <Text dimColor>Status: </Text>
      <Text color={statusColor(status)}>{status}</Text>
    </Text>
  );
}

function statusColor(status: TuiState["status"]): "green" | "yellow" | "red" {
  switch (status) {
    case "idle":
      return "green";
    case "running":
      return "yellow";
    case "failed":
      return "red";
  }
}
