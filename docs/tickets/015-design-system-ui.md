# Ticket: Design-system UI primitives

**Status:** Planned

## Objective
Implement ArchForge semantic tokens and reusable accessible primitives.
## Why
Feature UI needs a coherent technical visual language without one-off components.
## Prerequisites
Ticket 004.
## Scope
Tokens plus buttons, inputs, selects, badges, cards, panels, toolbar, dialog, tabs, tooltip, inspector shell, empty/error/validation states, and activity entry.
## Explicitly Out of Scope
Complete product screens, theme editor, animation system, and external component showcase.
## Files / Modules Expected to Change
`src/app/globals.css`, `src/components/ui/*`, component tests.
## Technical Requirements
Semantic CSS variables, composable typed props, ref support where needed, minimal dependencies, no raw feature colors.
## API / Contract Requirements
Primitives expose accessible labels/state and stable variants (`primary`, `secondary`, `ghost`, `danger`) only where needed.
## UI Requirements
Meet `docs/design-system.md`, WCAG AA, keyboard focus, disabled/error states, reduced motion, desktop and narrow sizing.
## State / Data Requirements
Primitives are controlled or explicitly document local ephemeral state.
## Error Handling
Error/validation primitives preserve context and use live-region behavior appropriately.
## Tests
Render, keyboard, focus, labels, variants, disabled/error states, dialog/tabs behavior.
## Acceptance Criteria
Later feature screens can be assembled without introducing a new base primitive.
## Definition of Done
Component tests and four validation commands pass; ticket/sprint updated.
## Commit Message
`feat: add archforge design system primitives`
