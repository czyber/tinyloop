import { Text, useInput } from "ink";
import { useState } from "react";

export type PromptInputProps = {
  disabled: boolean;
  onSubmit(text: string): void | Promise<void>;
};

export function PromptInput({ disabled, onSubmit }: PromptInputProps) {
  const [value, setValue] = useState("");
  useInput((input, key) => {
    if (input) {
      setValue(value + input);
    }
    if (key.delete) {
      setValue(value.slice(0, -1));
    }
    if (key.return) {
      onSubmit(value);
      setValue("");
    }
  });
  return (
    <Text>
      <Text color={disabled ? "gray" : "cyan"}>{disabled ? "…" : "›"}</Text>
      <Text dimColor={value.length === 0}> {value.length === 0 ? "Ask tinyloop..." : value}</Text>
    </Text>
  );
}
