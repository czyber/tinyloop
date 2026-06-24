import { Box, Text } from "ink";
import type { TranscriptItem } from "../state/tui-state.js";

type ToolItem = Extract<TranscriptItem, { type: "tool" }>;

export type ToolCardProps = {
  item: ToolItem;
};

export function ToolCard({ item }: ToolCardProps) {
  const summary = summarizeTool(item);

  return (
    <Box
      borderColor={item.status === "running" ? "yellow" : "gray"}
      borderStyle="round"
      flexDirection="column"
      paddingX={1}
    >
      <Text>
        <Text color="magenta">tool</Text>
        <Text dimColor> / </Text>
        <Text>{item.name}</Text>
        <Text dimColor> / </Text>
        <Text color={item.status === "running" ? "yellow" : "green"}>{item.status}</Text>
      </Text>
      {summary ? <Text dimColor>{summary}</Text> : null}
      {item.output.length > 0 ? <Text>{item.output.trimEnd()}</Text> : null}
      {item.status === "completed" ? <Text dimColor>{summarizeDetails(item.details)}</Text> : null}
    </Box>
  );
}

function summarizeTool(item: ToolItem): string | undefined {
  const parsedArgs = parseRecord(item.args);
  if (typeof parsedArgs?.command === "string") {
    return `$ ${parsedArgs.command}`;
  }

  if (typeof parsedArgs?.path === "string") {
    return parsedArgs.path;
  }

  return item.args;
}

function summarizeDetails(details: unknown): string {
  if (!details || typeof details !== "object") {
    return "completed";
  }

  if ("exitCode" in details && (typeof details.exitCode === "number" || details.exitCode === null)) {
    return `exit ${details.exitCode ?? "unknown"}`;
  }

  return "completed";
}

function parseRecord(value: string): Record<string, unknown> | undefined {
  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    return undefined;
  }

  return undefined;
}
