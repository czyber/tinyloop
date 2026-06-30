# tinyloop Site Design System

The site should feel like readable machinery: calm, technical, explicit, and mature enough to make the small codebase feel considered rather than cute.

## Visual Foundation

- Background: neutral gray paper with a faint gray grid.
- Primary: blue (`#0268cf`) for outbound events, focus, and primary signal.
- Secondary: orange (`#e0770d`) for return events, results, cursor, and secondary emphasis.
- Color discipline: use only blue, orange, and neutral opacity roles. Do not introduce extra accent hues.
- Corners: cards and panels stay at `8px` or less. Controls use `6px`.
- Logo: a framed SVG loop mark. Keep the shape simple enough to read at favicon/header size.
- Type: Instrument Serif for large editorial headings, Recursive for readable mono-ish copy, Instrument Sans for UI,
  and JetBrains Mono for commands, events, and code.

## Motion

- Use motion to express state: reveal, stream, focus, complete.
- Keep transitions under `260ms` for interaction and around `620ms` for page reveal.
- Respect `prefers-reduced-motion` by removing animation and revealing content immediately.

## Component Rules

- Hero text is never placed in a card. The background visual is an unannotated canvas-rendered infinity graph with a
  separate event stack beneath it.
- Tool, event, and code surfaces use stable dimensions so hover and streaming states do not shift layout.
- Shadows are shallow and soft. Avoid glossy, oversized, rainbow-coded, or decorative effects that compete with the educational content.
