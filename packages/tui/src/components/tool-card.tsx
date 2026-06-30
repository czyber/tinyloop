import { Box, Text } from "ink";
import type { TranscriptItem, TurnView } from "../state/tui-state.js";
import { AssistantMessage } from "./assistant-message.js";
import { colors, statusColor } from "./theme.js";

type ToolItem = Extract<TranscriptItem, { type: "tool" }>;
const MAX_OUTPUT_LINES = 18;

export type ToolCardProps = {
  item: ToolItem;
  turnStatus: TurnView["status"];
};

export function ToolCard({ item, turnStatus }: ToolCardProps) {
  const summary = summarizeTool(item);
  const commandDetails = parseCommandDetails(item.details);
  const output = formatToolOutput(commandDetails?.stdout ?? item.output);
  const stderr = formatToolOutput(commandDetails?.stderr ?? "");
  const completed = item.status === "completed";
  const result = summarizeDetails(item.details);

  return (
    <Box flexDirection="column" marginBottom={1} marginLeft={2}>
      <Box>
        <Text>
          <Text color={colors.text}>{item.name}</Text>
          <Text color={colors.subtle}> · </Text>
          <Text color={item.status === "running" ? statusColor("running") : colors.muted}>{item.status}</Text>
          {completed && result ? (
            <>
              <Text color={colors.subtle}> · </Text>
              <Text color={colors.muted}>{result}</Text>
            </>
          ) : null}
          {turnStatus === "failed" ? (
            <>
              <Text color={colors.subtle}> · </Text>
              <Text color={colors.danger}>turn failed</Text>
            </>
          ) : null}
        </Text>
      </Box>

      {summary ? (
        <Text>
          <Text color={colors.subtle}> {summary.label}: </Text>
          <Text>{summary.value}</Text>
        </Text>
      ) : null}

      {output ? <ToolOutputSection label={commandDetails ? "stdout" : "output"} output={output} /> : null}

      {stderr ? <ToolOutputSection color={colors.danger} label="stderr" output={stderr} /> : null}

      {completed && !output && !stderr ? <Text color={colors.subtle}> no output</Text> : null}
    </Box>
  );
}

function ToolOutputSection({ color, label, output }: { color?: string; label: string; output: string }) {
  return (
    <Box flexDirection="column" marginTop={1}>
      <Text color={colors.subtle}> {label}</Text>
      <Box marginLeft={4}>
        <ToolOutputView color={color} output={output} />
      </Box>
    </Box>
  );
}

function ToolOutputView({ color, output }: { color?: string; output: string }) {
  if (looksLikeUnifiedDiff(output)) {
    return <AssistantMessage text={["```diff", output, "```"].join("\n")} />;
  }

  return <Text color={color}>{output}</Text>;
}

function summarizeTool(item: ToolItem): { label: string; value: string } | undefined {
  const parsedArgs = parseRecord(item.args);
  if (typeof parsedArgs?.command === "string") {
    return { label: "command", value: `$ ${parsedArgs.command}` };
  }

  if (typeof parsedArgs?.path === "string") {
    return { label: "path", value: parsedArgs.path };
  }

  return { label: "args", value: item.args };
}

function summarizeDetails(details: unknown): string | undefined {
  if (!details || typeof details !== "object") {
    return undefined;
  }

  if ("exitCode" in details && (typeof details.exitCode === "number" || details.exitCode === null)) {
    return `exit ${details.exitCode ?? "unknown"}`;
  }

  return undefined;
}

function parseCommandDetails(details: unknown): { stdout: string; stderr: string } | undefined {
  if (!details || typeof details !== "object") {
    return undefined;
  }

  if (!("stdout" in details) || !("stderr" in details)) {
    return undefined;
  }

  if (typeof details.stdout !== "string" || typeof details.stderr !== "string") {
    return undefined;
  }

  return {
    stdout: details.stdout,
    stderr: details.stderr,
  };
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
