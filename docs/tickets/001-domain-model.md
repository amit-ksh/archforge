# Ticket: Provider-neutral domain model

**Status:** Complete

## Objective
Implement the canonical architecture aggregate and mutation commands.
## Why
Every projection, persistence adapter, and tool must share one invariant-preserving source of truth.
## Prerequisites
Ticket 000.
## Scope
Architecture, requirement, constraint, component, connection, decision, resolution references, IDs/timestamps, domain errors, and all commands named in `docs/architecture.md`.
## Explicitly Out of Scope
Runtime boundary schemas, persistence, catalogs, scoring, React, and browser code.
## Files / Modules Expected to Change
`src/domain/architecture/*`, `src/application/commands/*`.
## Technical Requirements
Pure immutable TypeScript; enforce unique IDs, valid endpoints, no self-edge, cleanup on removal, and independent technology/provider/service fields.
## API / Contract Requirements
Expose typed constructors/operations and discriminated command types; stable structured domain error codes.
## UI Requirements
None.
## State / Data Requirements
Architecture state excludes editor/history state and retains explicit existing-infrastructure flags and constraints.
## Error Handling
Rejected operations return/throw only known domain errors without partial mutation.
## Tests
Creation, every mutation, duplicate/missing IDs, self-edge, cleanup, resolution clearing, and immutability.
## Acceptance Criteria
All required commands are representable and no vendor is implied by a component type.
## Definition of Done
Domain tests and four validation commands pass; ticket/sprint updated.
## Commit Message
`feat: add provider-neutral architecture domain model`
