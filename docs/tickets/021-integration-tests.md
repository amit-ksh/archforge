# Ticket: Critical integration and end-to-end tests

**Status:** Planned

## Objective
Verify the MVP across domain, IndexedDB, UI, WebMCP, validation, and export boundaries.
## Why
Isolated tests cannot catch composition and browser-contract failures.
## Prerequisites
Ticket 020.
## Scope
Integration fixtures and Playwright journeys for local user design, reload persistence, resolution/validation/export, and fake/available WebMCP agent design with visible activity.
## Explicitly Out of Scope
Cross-browser matrix beyond configured MVP browser, load testing, remote services, and visual snapshot sprawl.
## Files / Modules Expected to Change
`tests/integration/*`, `tests/e2e/*`, Playwright fixtures/config, targeted production code fixes.
## Technical Requirements
Deterministic IDs/data, isolated IndexedDB per test, download assertions, no arbitrary sleeps, robust accessible locators.
## API / Contract Requirements
Assert schema envelopes and mutation metadata at WebMCP boundary.
## UI Requirements
Keyboard-critical path and narrow viewport smoke coverage.
## State / Data Requirements
Verify canonical data after reload and that Editor/Activity state does not pollute persisted records.
## Error Handling
Cover corrupt persisted record recovery and failed WebMCP/export user visibility.
## Tests
All named journeys plus full unit/integration and `pnpm test:e2e`.
## Acceptance Criteria
Critical MVP journeys pass from a clean browser context and catch cross-layer regressions.
## Definition of Done
All validation/E2E commands pass; ticket/sprint updated.
## Commit Message
`test: cover critical archforge workflows`
