# Return Structured Tool Results

## Recommendation

Tools should return structured results for the UI, while still providing a plain string output for the model.

## Why This Matters

The model needs compact text. The UI needs shape.

A file edit result is not just text; it might include a path, whether the file was created, and a diff. A command result is not just text; it has stdout, stderr, exit code, duration, and maybe timeout state.

If tools only return strings, the GUI later has to parse strings back into structure. That is avoidable debt.

## Guideline

Separate model output from display output.

For example, a tool result can conceptually contain:

- `modelOutput`: text sent back to the model
- `display`: structured data for UI rendering

Do not make the structure too clever at first. Add fields when a UI actually needs them.

## What To Do Next

Start with the existing tools:

- `read_file`
- `write_file`
- `edit_file`
- `run_command`

For each one, write down what the model needs versus what a human needs to see.

Then adjust the tool handler type so future tools can return both.

## Design Questions

- Should diffs be stored as unified diff text, structured hunks, or both?
- Should absolute filesystem paths be shown to the UI, the model, or neither?
- How should large outputs be truncated for the model while remaining inspectable in the UI?
- How should binary files or non-UTF-8 output be represented?

## UI Notes

Ink can render compact summaries by default and expand details with keyboard controls later.

React/Tailwind/shadcn can render structured tool results as panels: command output tabs, diff viewers, file badges, and error states.
