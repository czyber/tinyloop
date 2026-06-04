import type { ResponseFunctionToolCall, ResponseOutputItem } from "openai/resources/responses/responses.mjs";

export function isToolCall(output: ResponseOutputItem): output is ResponseFunctionToolCall {
  return output.type === "function_call";
}
