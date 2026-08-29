# Ticket: Canvas foundation

**Status:** Planned

## Objective
Create a model-driven architecture canvas foundation with separate editor state.
## Why
Users need a spatial projection without turning visual nodes into a second data model.
## Prerequisites
Ticket 003.
## Scope
Projection functions, editor store, nodes, SVG connections, selection, drag-to-command position updates, pan/zoom controls, grid, and empty state.
## Explicitly Out of Scope
Final visual polish, minimap, advanced auto-layout, collaboration, and resolution UI.
## Files / Modules Expected to Change
`src/features/editor/*`, `src/components/canvas/*`, composition provider.
## Technical Requirements
Client boundary only where browser interaction requires it; canonical updates dispatch application commands; deterministic keyed projections.
## API / Contract Requirements
Canvas consumes architecture snapshots and emits typed editor intents/commands.
## UI Requirements
Keyboard-selectable nodes, visible focus, zoom controls, readable empty state, reduced-motion support.
## State / Data Requirements
Viewport/selection/drafts stay in Editor State; durable positions stay in Component data; History State is isolated.
## Error Handling
Failed commands restore the last snapshot and surface a structured message.
## Tests
Projection, selection, pan/zoom bounds, keyboard access, drag command, and failed-command recovery.
## Acceptance Criteria
Canvas renders components/connections solely from canonical state and is usable without a pointer.
## Definition of Done
Editor tests and four validation commands pass; ticket/sprint updated.
## Commit Message
`feat: add model-driven canvas foundation`
