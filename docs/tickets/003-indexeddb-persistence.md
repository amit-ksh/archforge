# Ticket: IndexedDB persistence

**Status:** Planned

## Objective
Persist architectures locally behind an application-owned repository port.
## Why
The MVP must survive reloads without coupling domain logic to IndexedDB.
## Prerequisites
Ticket 002.
## Scope
`ArchitectureRepository`, in-memory adapter, IndexedDB adapter, versioned record parsing/migration seam, and create/get/list/save/delete application service flows.
## Explicitly Out of Scope
Remote sync, authentication, collaborative storage, and history persistence.
## Files / Modules Expected to Change
`src/application/ports/*`, `src/application/services/*`, `src/infrastructure/persistence/*`.
## Technical Requirements
Use native IndexedDB or a focused wrapper; atomic single-aggregate saves; deterministic updated ordering; injectable repository/clock/ID.
## API / Contract Requirements
Repository methods accept/return domain aggregates; adapters validate serialized contracts at the boundary.
## UI Requirements
None beyond service readiness.
## State / Data Requirements
Database/store/schema versions are constants; corrupt data is never silently dropped.
## Error Handling
Map unavailable/quota/corrupt errors to structured persistence errors with retryability.
## Tests
Shared repository contract against memory and fake IndexedDB; corrupt record, overwrite, delete, list order, unavailable database.
## Acceptance Criteria
Domain/application have no IndexedDB imports and both adapters satisfy identical behavior.
## Definition of Done
Repository tests and four validation commands pass; ticket/sprint updated.
## Commit Message
`feat: add indexeddb architecture repository`
