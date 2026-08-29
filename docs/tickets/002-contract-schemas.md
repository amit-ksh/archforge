# Ticket: Runtime contract schemas

**Status:** Complete

## Objective
Implement versioned runtime schemas and boundary result contracts.
## Why
Persisted, imported, and WebMCP data is untrusted at runtime.
## Prerequisites
Ticket 001.
## Scope
All schemas in `docs/contracts.md`, inferred types, domain mapping, fixtures, and error/result helpers.
## Explicitly Out of Scope
IndexedDB, tool registration, and UI form validation.
## Files / Modules Expected to Change
`src/application/contracts/*`, contract test fixtures.
## Technical Requirements
Use one lightweight schema library; strict objects, ISO dates, opaque string IDs, discriminated results, schema version constant.
## API / Contract Requirements
Export parse/safe-parse entry points and domain-to-contract mapping without leaking schema objects into domain.
## UI Requirements
None.
## State / Data Requirements
Round trips preserve every canonical field; unknown/invalid records fail before hydration.
## Error Handling
Map schema issues to `VALIDATION_ERROR` with field paths; sanitize unknown failures.
## Tests
Valid, invalid, unknown-key, date, discriminant, error-envelope, and aggregate round-trip fixtures.
## Acceptance Criteria
Types derive from schemas where practical and contract/domain drift is test-detectable.
## Definition of Done
Contract tests and four validation commands pass; ticket/sprint updated.
## Commit Message
`feat: add runtime architecture contract schemas`
