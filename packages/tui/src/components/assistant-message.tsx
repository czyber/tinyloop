import { supportsLanguage } from "cli-highlight";
import { Box, Text } from "ink";
import SyntaxHighlight from "ink-syntax-highlight";

type AssistantMessageProps = {
  text: string;
};

type MarkdownBlock =
  | { type: "text"; lines: string[] }
  | {
      type: "code";
      language: string | undefined;
      lines: string[];
    };

export function AssistantMessage({ text }: AssistantMessageProps) {
  return (
    <Box flexDirection="column">
      {parseMarkdownBlocks(text).map((block) => (
        <MarkdownBlockView block={block} key={blockKey(block)} />
      ))}
    </Box>
  );
}

function MarkdownBlockView({ block }: { block: MarkdownBlock }) {
  if (block.type === "text") {
    return (
      <>
        {block.lines.map((line) => (
          <Text key={line}>{line}</Text>
        ))}
      </>
    );
  }

  return (
    <Box flexDirection="column" marginY={1}>
      <Text dimColor>{block.language ? block.language : "code"}</Text>
      {isDiffLanguage(block.language) ? (
        block.lines.map((line) => <DiffLine line={line} key={line} />)
      ) : (
        <SyntaxHighlight code={block.lines.join("\n")} language={highlightLanguage(block.language)} />
      )}
    </Box>
  );
}

function DiffLine({ line }: { line: string }) {
  const color = diffLineColor(line);

  return (
    <Text color={color} dimColor={color === undefined}>
      {"  "}
      {line.length === 0 ? " " : line}
    </Text>
  );
}

function diffLineColor(line: string): "cyan" | "green" | "red" | undefined {
  if (line.startsWith("+") && !line.startsWith("+++")) {
    return "green";
  }

  if (line.startsWith("-") && !line.startsWith("---")) {
    return "red";
  }

  if (line.startsWith("@@")) {
    return "cyan";
  }

  return undefined;
}

function isDiffLanguage(language: string | undefined): boolean {
  const languageName = parseLanguageName(language);
  return languageName === "diff" || languageName === "patch";
}

function highlightLanguage(language: string | undefined): string | undefined {
  const languageName = parseLanguageName(language);
  if (!languageName) {
    return undefined;
  }

  const languageAliases: Record<string, string> = {
    gitignore: "plaintext",
    ignore: "plaintext",
    plain: "plaintext",
  };

  const highlightedLanguage = languageAliases[languageName] ?? languageName;
  return supportsLanguage(highlightedLanguage) ? highlightedLanguage : "plaintext";
}

function parseLanguageName(language: string | undefined): string | undefined {
  if (!language) {
    return undefined;
  }

  const words = language.trim().toLowerCase().split(/\s+/);
  const firstWord = words[0]?.replace(/^language-/, "");

  if (firstWord === "code" && words[1]) {
    return words[1].replace(/^language-/, "");
  }

  return firstWord;
}

function blockKey(block: MarkdownBlock): string {
  if (block.type === "text") {
    return `${block.type}-${block.lines.join("\n")}`;
  }

  return `${block.type}-${block.language ?? ""}-${block.lines.join("\n")}`;
}

function parseMarkdownBlocks(text: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  const textBuffer: string[] = [];
  let codeBuffer: string[] | undefined;
  let codeLanguage: string | undefined;

  function flushText() {
    if (textBuffer.length === 0) {
      return;
    }

    blocks.push({ type: "text", lines: textBuffer.splice(0) });
  }

  function flushCode() {
    if (!codeBuffer) {
      return;
    }

    blocks.push({ type: "code", language: codeLanguage, lines: codeBuffer });
    codeBuffer = undefined;
    codeLanguage = undefined;
  }

  for (const line of text.split("\n")) {
    if (line.startsWith("```")) {
      if (codeBuffer) {
        flushCode();
      } else {
        flushText();
        codeLanguage = line.slice(3).trim() || undefined;
        codeBuffer = [];
      }
      continue;
    }

    if (codeBuffer) {
      codeBuffer.push(line);
      continue;
    }

    textBuffer.push(line);
  }

  flushCode();
  flushText();

  return blocks;
}
