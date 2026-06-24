import { Box, Text } from "ink";
import type { TranscriptItem } from "../state/tui-state.js";
import { AssistantMessage } from "./assistant-message.js";

type ToolItem = Extract<TranscriptItem, { type: "tool" }>;
const MAX_OUTPUT_LINES = 18;

export type ToolCardProps = {
  item: ToolItem;
};

export function ToolCard({ item }: ToolCardProps) {
  const summary = summarizeTool(item);
  const output = formatToolOutput(item.output);

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
      {output ? <ToolOutputView output={output} /> : null}
      {item.status === "completed" ? <Text dimColor>{summarizeDetails(item.details)}</Text> : null}
    </Box>
  );
}

function ToolOutputView({ output }: { output: string }) {
  if (looksLikeUnifiedDiff(output)) {
    return <AssistantMessage text={["```diff", output, "```"].join("\n")} />;
  }

  return <Text>{output}</Text>;
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

function formatToolOutput(output: string): string | undefined {
  const trimmedOutput = output.trimEnd();
  if (trimmedOutput.length === 0) {
    return undefined;
  }

  const lines = trimmedOutput.split("\n");
  if (lines.length <= MAX_OUTPUT_LINES) {
    return trimmedOutput;
  }

  return [...lines.slice(0, MAX_OUTPUT_LINES), `... ${lines.length - MAX_OUTPUT_LINES} more lines`].join("\n");
}

function looksLikeUnifiedDiff(output: string): boolean {
  return output.startsWith("Index: ") || output.includes("\n@@ ");
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
