# Ticket: High-level design_system workflow

**Status:** Planned

## Objective
Compose primitive commands into a validated high-level WebMCP architecture workflow.
## Why
Agents need an efficient entry point while preserving explicit steps, evidence, and failure semantics.
## Prerequisites
Tickets 014 and 019.
## Scope
`design_system` schema, preflight validation, sequential orchestration, ID correlation, completed-step reporting, final validation, unresolved decisions, and activity events.
## Explicitly Out of Scope
LLM generation, undocumented rollback, silent vendor choice, deployment, and concurrent mutations.
## Files / Modules Expected to Change
`src/webmcp/tools/design-system/*`, workflow service/tests.
## Technical Requirements
Validate whole request before mutation; order metadata, requirements/constraints, components, connections, optional explicit resolutions; deterministic IDs via injected factory.
## API / Contract Requirements
Match `docs/webmcp.md`; report executed steps, affected IDs, final revision/issues, unresolved decisions, and failed prefix when non-atomic.
## UI Requirements
Emit one parent activity plus meaningful child steps without flooding announcements.
## State / Data Requirements
No workflow-owned architecture copy; each step uses current application service state.
## Error Handling
Preflight causes zero writes; runtime failure reports completed prefix and recovery; never claim rollback unless implemented/tested.
## Tests
Full success, preflight rejection/no writes, mid-flow failure prefix, explicit resolution, unresolved choices, activity grouping, strict schema.
## Acceptance Criteria
One call can construct and validate a neutral system while every mutation remains auditable.
## Definition of Done
Workflow tests and four validation commands pass; ticket/sprint updated.
## Commit Message
`feat: add webmcp design system workflow`
