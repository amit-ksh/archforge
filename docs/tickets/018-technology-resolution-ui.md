# Ticket: Technology resolution UI

**Status:** Planned

## Objective
Let users compare justified candidates and explicitly resolve each architecture component.
## Why
Provider-neutral modeling becomes useful when tradeoffs remain visible through concrete selection.
## Prerequisites
Ticket 017.
## Scope
Technology/provider/service candidate panels, reason/tradeoff/conflict display, filters, explicit apply/clear actions, resolution trail in inspector/node.
## Explicitly Out of Scope
One-click auto-resolution, cost estimates, exhaustive catalog browsing, and live provider data.
## Files / Modules Expected to Change
`src/features/resolution/*`, inspector/node projection components.
## Technical Requirements
Query on current snapshot; stable loading/cancellation; selections go through commands; incompatible existing choices remain visible with issue.
## API / Contract Requirements
Consume resolver result fields without UI-only inference; exact catalog IDs on mutations.
## UI Requirements
Compare evidence before CTA; distinguish blocked, recommended, alternative, selected, and unresolved states without color alone.
## State / Data Requirements
Filters/open candidate are Editor State; only explicit selections persist.
## Error Handling
No-options and stale/incompatible selection states explain recovery; failed apply keeps panel context.
## Tests
Rank display, evidence, filters, set/clear levels, no options, changed constraints, failed apply.
## Acceptance Criteria
Users can move independently through capability, technology, provider, and service with rationale.
## Definition of Done
Feature tests and four validation commands pass; ticket/sprint updated.
## Commit Message
`feat: add technology resolution experience`
