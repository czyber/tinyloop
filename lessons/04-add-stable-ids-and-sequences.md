# Add Stable IDs And Sequences

## Recommendation

Every event should carry stable identifiers. At minimum, use `sessionId`, `turnId`, and `sequence`. Tool events should also include `callId`.

## Why This Matters

Text output can be displayed linearly, but real UIs need to update specific things:

- mark one tool call as running
- append output to one command
- resolve one approval prompt
- replace a spinner with a result
- show which turn failed

Stable IDs make those updates deterministic.

## Guideline

Use IDs to group events. Use sequence numbers to order events.

Do not rely only on array position in the UI. UIs rerender, reconnect, filter, collapse sections, and replay history.

## What To Do Next

Decide where IDs are created. A practical starting point is:

- session creates `sessionId`
- each user message creates a `turnId`
- model tool calls reuse the model `call_id` as `callId`
- the session increments a numeric `sequence` for each emitted event

Keep the ID scheme simple until you have evidence it needs more.

## Design Questions

- Do IDs need to survive process restart?
- Should sequence be per session or per turn?
- How should reconnecting GUI clients request missed events?
- Should events include timestamps, or should the UI add them when received?

## UI Notes

Ink will use IDs to keep terminal regions stable while output streams in.

React/Tailwind/shadcn will use IDs as component keys and to update specific tool panels without rebuilding the whole transcript.
