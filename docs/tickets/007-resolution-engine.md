# Ticket: Requirement-aware resolution engine

**Status:** Complete

## Objective
Rank compatible technologies/services using explicit architecture evidence.
## Why
Technology choices must reflect requirements and constraints rather than canned mappings.
## Prerequisites
Tickets 003, 005, and 006.
## Scope
Candidate filtering/scoring, reason/tradeoff/conflict results, list/suggest queries, and set technology/provider/service commands.
## Explicitly Out of Scope
Machine-learning ranking, cost feeds, silent auto-selection, and catalog expansion.
## Files / Modules Expected to Change
`src/domain/resolution/*`, application resolution handlers/services.
## Technical Requirements
Deterministic rules; hard constraints filter, preferences score; existing infrastructure affects compatibility; stable tie ordering; selections validate cross-references.
## API / Contract Requirements
Return candidate ID, score band, reasons, tradeoffs, conflicts, and evidence IDs; suggestions are read-only.
## UI Requirements
Results include display-ready explanation data but no React elements.
## State / Data Requirements
Explicit choices persist; changed constraints create issues instead of silently rewriting choices.
## Error Handling
Return `INCOMPATIBLE_SELECTION` with evidence and viable alternatives when available.
## Tests
Requirements, hard/soft constraints, existing infrastructure, provider preference, ties, no-option case, selection/clearing.
## Acceptance Criteria
Changing evidence changes explainable ranking; neutral components remain unresolved until an explicit command.
## Definition of Done
Resolver tests and four validation commands pass; ticket/sprint updated.
## Commit Message
`feat: add requirement-aware resolution engine`
