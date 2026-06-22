import type { SessionDriver, UiSessionEvent } from "./session-driver.js";

export type FakeSessionDriverOptions = {
  events?: Iterable<UiSessionEvent> | AsyncIterable<UiSessionEvent>;
  onUserMessage?: (text: string) => void | Promise<void>;
};

export function createFakeSessionDriver(options: FakeSessionDriverOptions = {}): SessionDriver {
  return {
    sendUserMessage: async (text) => {
      await options.onUserMessage?.(text);
    },
    async *events() {
      if (!options.events) {
        return;
      }

      yield* options.events;
    },
  };
}
