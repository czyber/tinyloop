import type { TuiState } from "../state/tui-state.js";

export const colors = {
  text: "#e4e4e7",
  muted: "#71717a",
  subtle: "#52525b",
  rule: "#3f3f46",
  accent: "#93c5fd",
  success: "#86efac",
  warning: "#fcd34d",
  danger: "#fca5a5",
} as const;

export function statusColor(status: TuiState["status"] | "completed" | "running"): string {
  switch (status) {
    case "idle":
    case "completed":
      return colors.muted;
    case "running":
      return colors.warning;
    case "failed":
      return colors.danger;
  }
}
