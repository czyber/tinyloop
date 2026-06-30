import { Box, Text } from "ink";
import Spinner from "ink-spinner";
import TextInput from "ink-text-input";
import { useState } from "react";
import { colors } from "./theme.js";

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
          <Text color={colors.warning}>
            <Spinner type="dots" />
          </Text>
          <Text color={colors.muted}> running</Text>
        </>
      ) : (
        <>
          <Text color={colors.muted}>you</Text>
          <Text color={colors.subtle}> › </Text>
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
            placeholder="Message tinyloop"
            showCursor
            value={value}
          />
        </>
      )}
    </Box>
  );
}
