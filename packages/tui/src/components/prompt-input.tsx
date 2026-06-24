import { Box, Text } from "ink";
import Spinner from "ink-spinner";
import TextInput from "ink-text-input";
import { useState } from "react";

export type PromptInputProps = {
  disabled: boolean;
  onSubmit(text: string): void | Promise<void>;
};

export function PromptInput({ disabled, onSubmit }: PromptInputProps) {
  const [value, setValue] = useState("");

  return (
    <Box>
      {disabled ? (
        <>
          <Text color="yellow">
            <Spinner type="dots" />
          </Text>
          <Text dimColor> working...</Text>
        </>
      ) : (
        <>
          <Text color="cyan">{"> "}</Text>
          <TextInput
            focus={!disabled}
            highlightPastedText
            onChange={setValue}
            onSubmit={(submittedValue) => {
              const trimmedValue = submittedValue.trim();
              if (trimmedValue.length === 0) {
                return;
              }

              setValue("");
              void onSubmit(trimmedValue);
            }}
            placeholder="Ask tinyloop..."
            showCursor
            value={value}
          />
          <Text dimColor> Enter to send</Text>
        </>
      )}
    </Box>
  );
}
