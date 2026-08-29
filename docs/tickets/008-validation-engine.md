# Ticket: Architecture validation engine

**Status:** Planned

## Objective
Produce deterministic, actionable validation issues for canonical architectures.
## Why
Users and agents need explicit feedback before trusting or exporting a design.
## Prerequisites
Ticket 007.
## Scope
Rule interface and rules for graph integrity, orphan components, unresolved choices, incompatible selections, unmet constraints, missing requirement coverage, and basic resilience concerns.
## Explicitly Out of Scope
LLM review, formal verification, cost analysis, and provider live checks.
## Files / Modules Expected to Change
`src/domain/validation/*`, validation query handler.
## Technical Requirements
Pure rules, stable ordering/IDs, severity levels, affected references, suggested actions, and deduplication.
## API / Contract Requirements
Return `ValidationIssueSchema[]`; validation never mutates.
## UI Requirements
Messages are concise and identify the affected entity and recovery action.
## State / Data Requirements
Issues are derived, not persisted as canonical state.
## Error Handling
A rule failure is isolated and surfaced as a sanitized engine error; invalid input cannot enter rules.
## Tests
Each rule, severity, stable order, deduplication, valid architecture, and multiple simultaneous issues.
## Acceptance Criteria
Results are repeatable and every issue contains evidence and an actionable next step.
## Definition of Done
Validation tests and four validation commands pass; ticket/sprint updated.
## Commit Message
`feat: add architecture validation engine`
