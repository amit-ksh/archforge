# Ticket: WebMCP architecture and requirement tools

**Status:** Planned

## Objective
Expose architecture and requirement operations through WebMCP.
## Why
Agents need safe primitives for workspace creation and requirement modeling.
## Prerequisites
Ticket 010.
## Scope
`create_architecture`, `get_architecture`, `update_architecture`, `clear_architecture`, requirement CRUD, and `list_requirements`.
## Explicitly Out of Scope
Components, connections, resolution, analysis, export, and high-level workflow.
## Files / Modules Expected to Change
`src/webmcp/tools/architecture/*`, `requirements/*`.
## Technical Requirements
Thin adapters call application services; stable descriptions; explicit confirmation on clear; register as one cohesive tool set.
## API / Contract Requirements
Match `docs/webmcp.md`; strict schemas, exact result envelopes, revision and mutation summaries.
## UI Requirements
Activity summaries are concise and human-readable.
## State / Data Requirements
No adapter cache; list ordering matches application query.
## Error Handling
Test not-found, conflict, invalid patch, and clear-without-confirmation.
## Tests
Every tool success, invalid input, service error mapping, mutation declaration, and activity event.
## Acceptance Criteria
All architecture/requirement operations work against an in-memory repository through a fake host.
## Definition of Done
Tool tests and four validation commands pass; ticket/sprint updated.
## Commit Message
`feat: add webmcp architecture tools`
