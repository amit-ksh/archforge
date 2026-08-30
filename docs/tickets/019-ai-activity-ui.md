# Ticket: AI activity UI

**Status:** Complete

## Objective
Make WebMCP actions and failures visible inside the workspace.
## Why
AI-native changes must be observable and auditable rather than silently appearing.
## Prerequisites
Tickets 014 and 015.
## Scope
Bounded activity store, activity panel/list, status/tool/summary/timestamp/affected IDs, running/success/error states, entity navigation, clear local log.
## Explicitly Out of Scope
Remote audit log, replay, collaboration feed, prompt content, and binary payload storage.
## Files / Modules Expected to Change
`src/features/activity/*`, WebMCP activity sink wiring.
## Technical Requirements
One-way events from adapters; bounded in-memory/session-local retention; sanitized details; accessible announcements without noise.
## API / Contract Requirements
Activity event is presentation-neutral and includes correlation ID for failures.
## UI Requirements
Compact chronological entries, AI semantic accent/provenance, expandable details, empty state, keyboard navigation.
## State / Data Requirements
Activity is derived operational state, not Architecture State or IndexedDB data.
## Error Handling
Activity rendering tolerates unknown tool names and missing affected entities.
## Tests
Running-to-success/error, bounded retention, sanitization, navigation, clear, unknown entity/tool.
## Acceptance Criteria
Every WebMCP mutation produces a visible outcome and errors expose safe recovery context.
## Definition of Done
Activity tests and four validation commands pass; ticket/sprint updated.
## Commit Message
`feat: add visible ai activity feed`
