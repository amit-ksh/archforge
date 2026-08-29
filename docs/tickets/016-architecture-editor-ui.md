# Ticket: Architecture editor UI

**Status:** Planned

## Objective
Build the main ArchForge workspace around the canonical canvas.
## Why
Users need an efficient surface to create, inspect, connect, and validate components.
## Prerequisites
Tickets 008 and 015.
## Scope
Top toolbar, library rail, canvas region, component inspector, validation region, architecture create/load flow, component/connection edits, responsive panel behavior.
## Explicitly Out of Scope
Requirement editor depth, resolution chooser, AI activity, and final hackathon polish.
## Files / Modules Expected to Change
`src/app/page.tsx`, `src/features/workspace/*`, editor components, metadata.
## Technical Requirements
Client composition owns services/store; server page remains thin; all canonical writes dispatch commands; no duplicated model state.
## API / Contract Requirements
UI consumes application services and validation query through typed feature adapters.
## UI Requirements
Match documented layout, semantic node styles, keyboard navigation, visible selection/focus, empty/loading/error/retry states.
## State / Data Requirements
Architecture, Editor, and History state stay separate; selected IDs are resilient to deletion.
## Error Handling
Optimistic-looking interactions commit only after command success and show recoverable structured errors.
## Tests
Create/load, add/edit/remove/connect, selection/inspector, validation navigation, narrow panels, failure recovery.
## Acceptance Criteria
A user can build and inspect a neutral connected architecture locally without WebMCP.
## Definition of Done
Interaction tests and four validation commands pass; ticket/sprint updated.
## Commit Message
`feat: build architecture editor workspace`
