# Ticket: Requirements and constraints UI

**Status:** Complete

## Objective
Make requirements, operational preferences, and existing constraints first-class editor inputs.
## Why
Resolution and validation need visible evidence users can inspect and change.
## Prerequisites
Ticket 016.
## Scope
Requirement list/form, category/priority/target, constraint list/form, operational preference patterns, evidence links, delete confirmation, empty states.
## Explicitly Out of Scope
Natural-language extraction, collaboration, templates marketplace, and resolution candidates.
## Files / Modules Expected to Change
`src/features/requirements/*`, application constraint commands if absent.
## Technical Requirements
Runtime-validate form payloads before commands; stable IDs; accessible form labels/errors; reuse primitives.
## API / Contract Requirements
Use requirement/constraint command and query contracts; do not mutate repository directly.
## UI Requirements
Compact sortable list, clear hard-vs-preference distinction, visible priority and affected validation issues.
## State / Data Requirements
Draft forms are Editor State; saved items are Architecture State.
## Error Handling
Field errors stay attached to inputs; persistence conflicts retain drafts and offer retry.
## Tests
Add/update/remove, invalid fields, hard/preference rendering, keyboard form flow, retry with preserved draft.
## Acceptance Criteria
Users can express evidence that predictably influences resolver tests and UI results.
## Definition of Done
Feature tests and four validation commands pass; ticket/sprint updated.
## Commit Message
`feat: add requirements and constraints workspace`
