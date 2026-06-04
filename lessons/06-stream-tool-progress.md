# Stream Tool Progress

## Recommendation

Let tools emit progress events while they run. This is especially important for `run_command`, which currently buffers stdout and stderr until the process exits.

## Why This Matters

Long-running commands feel broken if the UI is silent. A professional TUI/GUI should show live output, running state, timeout state, and completion.

Streaming also helps diagnose failures. If a command hangs or dies, the user can see how far it got.

## Guideline

Treat tool execution as its own event source.

The agent loop can still wait for a final tool result before calling the model again, but the UI should not have to wait to see progress.

## What To Do Next

Focus first on `run_command`.

Think through these events:

- command started
- stdout chunk
- stderr chunk
- command exited
- command timed out

Then decide how those map into generic tool events without making every event command-specific.

## Design Questions

- Should stdout and stderr chunks be raw strings or line-buffered?
- How much output should be kept in memory?
- Should command output be throttled before sending to the GUI?
- How should cancellation kill running child processes?

## UI Notes

Ink can stream command output into a scrollable or collapsible region.

React/Tailwind/shadcn should avoid rerendering too often for rapid output. Consider batching UI updates later, but do not solve that before the event contract exists.
