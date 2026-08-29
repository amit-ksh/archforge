# Ticket: WebMCP component and connection tools

**Status:** Planned

## Objective
Expose semantic design mutations and queries through WebMCP.
## Why
Agents need to construct architecture through the same command path as users.
## Prerequisites
Ticket 011.
## Scope
`list_component_types`, component add/get/update/remove, and connection create/update/remove.
## Explicitly Out of Scope
Resolution selection, analysis, export, and workflow composition.
## Files / Modules Expected to Change
`src/webmcp/tools/components/*`, `connections/*`.
## Technical Requirements
Catalog-backed type validation; endpoint checks stay in domain; removal reports cascading connection IDs.
## API / Contract Requirements
Match documented payloads/results; update schemas distinguish omitted fields and null clearing.
## UI Requirements
Activity includes component/connection labels where available.
## State / Data Requirements
Positions are canonical component fields; selection/viewport are never exposed as architecture mutations.
## Error Handling
Map missing endpoints, duplicate/self connection, unknown type, and not-found errors.
## Tests
Every tool, strict schema failure, cascade summary, no DOM access, and fake-host integration.
## Acceptance Criteria
An agent can construct a connected neutral architecture without choosing vendors.
## Definition of Done
Tool tests and four validation commands pass; ticket/sprint updated.
## Commit Message
`feat: add webmcp design tools`
