# Ticket: Capability and technology catalog

**Status:** Complete

## Objective
Provide validated representative capability and technology catalog data.
## Why
Neutral component creation and evidence-based resolution require explicit catalog knowledge.
## Prerequisites
Ticket 002.
## Scope
Catalog schemas/ports plus common compute, API, web, database, cache, queue, storage, event, identity, observability, and network capabilities with multiple technology options.
## Explicitly Out of Scope
Provider services, exhaustive products, popularity rankings, and automatic selection.
## Files / Modules Expected to Change
`src/domain/catalog/*`, `src/infrastructure/catalogs/component-catalog.ts`.
## Technical Requirements
Immutable IDs; structured use cases, strengths, tradeoffs, operational traits, and compatible capability IDs; no default technology field.
## API / Contract Requirements
List/get/filter catalog port with runtime-validated source records.
## UI Requirements
Catalog summaries contain label, description, category, and semantic icon key.
## State / Data Requirements
Records are static read-only data outside the architecture aggregate.
## Error Handling
Invalid references fail catalog initialization with precise record/path information.
## Tests
Schema validity, unique IDs, reference integrity, category filters, and at least two viable options where meaningful.
## Acceptance Criteria
A database, queue, or cache can be modeled without a technology and options express tradeoffs.
## Definition of Done
Catalog tests and four validation commands pass; ticket/sprint updated.
## Commit Message
`feat: add capability and technology catalogs`
