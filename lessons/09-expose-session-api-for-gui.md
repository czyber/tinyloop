# Expose A Session API For The GUI

## Recommendation

Give the GUI a local server API for sessions. The browser should be able to list sessions, create sessions, attach to one session, replay prior events, stream new events, and send commands.

## Why This Matters

A GUI is not just a single prompt box. It needs navigation and recovery:

- show existing sessions
- create a new workspace session
- reconnect after refresh
- replay missed events
- attach multiple windows to one session later
- send approvals, denials, cancellation, and user messages

If the GUI only has a raw "run this prompt" endpoint, it cannot build a real application shell around the agent.

## Guideline

Keep session ownership in the local server. Keep rendering in the browser. Keep model, tool, filesystem, and shell access behind the server.

The shape should be:

```txt
GUI frontend -> local server -> SessionManager -> AgentSession -> Agent

GET  /sessions                         list session summaries
POST /sessions                         create a session
GET  /sessions/:sessionId              fetch one session summary or snapshot
GET  /sessions/:sessionId/events       replay and stream events
POST /sessions/:sessionId/commands     dispatch AgentCommand values
```

The TUI can skip the transport and use `AgentSession` directly:

```txt
Ink TUI -> AgentSession.dispatch(command)
Ink TUI <- AgentSession.events()
```

Do not create separate GUI-only command names or event names. The server should translate transport details, not agent behavior.

## What To Do Next

Define the session summary shape before building the GUI:

```ts
type SessionSummary = {
  sessionId: string;
  workspaceRoot: string;
  title: string;
  status: "idle" | "running" | "waiting_for_approval" | "failed";
  createdAt: string;
  updatedAt: string;
  currentTurnId?: string;
  lastSequence: number;
};
```

Then define the command endpoint around the same command union used in-process:

```ts
type AgentCommand =
  | { type: "user_message"; text: string }
  | { type: "approve_tool_call"; turnId: string; callId: string }
  | { type: "deny_tool_call"; turnId: string; callId: string; reason?: string }
  | { type: "cancel_turn"; turnId: string };
```

For event replay, let the GUI request events after a sequence number:

```txt
GET /sessions/:sessionId/events?since=42
```

The server can first send any retained events after `sequence=42`, then keep the connection open for new events.

## Design Questions

- Are sessions stored only in memory for the first version?
- Does `POST /sessions` require a `workspaceRoot`, or does the server choose one?
- Can a session run more than one turn at once, or should commands be rejected while busy?
- How many events should be retained for replay?
- What should the GUI show if a requested session no longer exists?
- Should local clients need an auth token, origin check, or both?

## UI Notes

React/Tailwind/shadcn should treat sessions as application navigation state and events as session content state.

The GUI should not infer session status by scraping transcript text. It should use session summaries and typed events from the server.
