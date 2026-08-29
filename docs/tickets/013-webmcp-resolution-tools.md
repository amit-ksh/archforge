# Ticket: WebMCP resolution tools

**Status:** Planned

## Objective
Expose catalogs, evidence-based suggestions, and explicit selection commands.
## Why
Agents must inspect rationale before selecting technology/provider/service.
## Prerequisites
Ticket 012.
## Scope
`list_technology_options`, `suggest_implementations`, `set_technology`, `set_provider`, and `set_cloud_service`.
## Explicitly Out of Scope
Implicit selection, cost feeds, AI ranking, and analysis tools.
## Files / Modules Expected to Change
`src/webmcp/tools/resolution/*`.
## Technical Requirements
Suggestions are read-only; mutation tools require exact catalog IDs or null; return evidence and conflicts.
## API / Contract Requirements
Match `docs/webmcp.md` and resolution contracts; mutation summaries name changed resolution level.
## UI Requirements
Activity differentiates suggestions from committed choices.
## State / Data Requirements
Adapters do not persist candidate rankings.
## Error Handling
Map incompatible/unknown IDs with viable alternatives when the engine provides them.
## Tests
Option listing, suggestions, every set/clear action, incompatibility, read-only declaration, strict input.
## Acceptance Criteria
An agent can explain then explicitly apply each resolution level without hidden mutation.
## Definition of Done
Tool tests and four validation commands pass; ticket/sprint updated.
## Commit Message
`feat: add webmcp resolution tools`
