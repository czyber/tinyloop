# Keep A Simple Wrapper

## Recommendation

Keep `runOneUserTurn()` as a compatibility wrapper, even after introducing the richer session, command, and event APIs.

## Why This Matters

The current API is useful for tests, scripts, and the minimal CLI. Removing it too early forces every caller to understand sessions, commands, and events immediately.

The richer API should power serious interfaces. The simple API should remain as a convenience.

## Guideline

Implement the lower-level session API first, then make `runOneUserTurn()` consume it internally and return the final assistant text.

That keeps one source of truth for behavior. The wrapper should not duplicate model/tool loop logic.

## What To Do Next

Define what "final text" means in the event model. Then make the wrapper create or use an `AgentSession`, dispatch a `user_message` command, collect the final event, and return its text.

Keep the wrapper boring. It should not render progress, approve tools, or know about Ink or React.

## Design Questions

- What should the wrapper do if the turn fails?
- Should it return only assistant text, or also metadata later?
- Should it be named `runOneUserTurn`, or should the event API make that name feel obsolete?
- How will tests assert that the wrapper and stream agree?
- Should the wrapper reject turns that require approval, auto-deny them, or require an approval policy option?

## UI Notes

The current CLI can remain wrapper-based for a little while. Once the TUI work starts, move the CLI onto the event stream too so terminal behavior is exercised by real UI code.
