import { Text } from "ink";
import type { TuiState } from "../state/tui-state.js";

export type StatusBarProps = {
  mode: "agent" | "demo";
  status: TuiState["status"];
};

export function StatusBar({ mode, status }: StatusBarProps) {
  return (
    <Text>
      <Text color="green">tinyloop</Text>
      <Text dimColor> · </Text>
      <Text color={mode === "demo" ? "yellow" : "cyan"}>{mode}</Text>
      <Text dimColor> · status: </Text>
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
