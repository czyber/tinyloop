# Add Stable IDs And Sequences

## Recommendation

Every event should carry stable identifiers. At minimum, use `sessionId`, `turnId`, and `sequence`. Tool events should also include `callId`.

Session metadata should also have stable identifiers because the GUI needs to list, attach to, and reconnect to sessions.

## Why This Matters

Text output can be displayed linearly, but real UIs need to update specific things:

- mark one tool call as running
- append output to one command
- resolve one approval prompt
- replace a spinner with a result
- show which turn failed

Stable IDs make those updates deterministic.

Stable session metadata lets a GUI show a session list without inspecting raw event logs. A session summary should be cheap to load and should not require starting a turn.

## Guideline

Use IDs to group events. Use sequence numbers to order events.

Do not rely only on array position in the UI. UIs rerender, reconnect, filter, collapse sections, and replay history.

## What To Do Next

Decide where IDs are created. A practical starting point is:

- session creates `sessionId`
- each user message creates a `turnId`
- model tool calls reuse the model `call_id` as `callId`
- the session increments a numeric `sequence` for each emitted event

Also decide which fields belong in a session list response. A practical starting point is:

- `sessionId`
- `workspaceRoot`
- `title`
- `status`
- `createdAt`
- `updatedAt`
- current `turnId`, if a turn is running
- last emitted `sequence`

Keep the ID scheme simple until you have evidence it needs more.

## Design Questions

- Do IDs need to survive process restart?
- Should sequence be per session or per turn?
- How should reconnecting GUI clients request missed events?
- Should events include timestamps, or should the UI add them when received?
- Which session fields should be derived from events versus stored as session metadata?
- Should session titles be user-provided, generated from the first message, or both?

## UI Notes

Ink will use IDs to keep terminal regions stable while output streams in.

React/Tailwind/shadcn will use IDs as component keys and to update specific tool panels without rebuilding the whole transcript.
