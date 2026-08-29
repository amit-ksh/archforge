# Ticket: Repository baseline

**Status:** Planned

## Objective
Turn the generated Next.js repository into a validated implementation base.
## Why
Every later ticket needs deterministic type, unit, browser, lint, and build checks.
## Prerequisites
Engineering blueprint committed; bundled Next.js 16 guides reviewed.
## Scope
Add pnpm scripts, Vitest/jsdom/testing-library and Playwright setup, one smoke test, module directories, metadata, and test setup.
## Explicitly Out of Scope
Domain behavior, product UI, persistence, catalogs, and WebMCP tools.
## Files / Modules Expected to Change
`package.json`, lockfile, test configs/setup, `src/app/layout.tsx`, initial module entry files.
## Technical Requirements
Use Next.js 16-supported configuration; keep strict TypeScript and App Router; tests resolve `@/*`.
## API / Contract Requirements
No public product API; scripts are `typecheck`, `test`, `test:watch`, and `test:e2e`.
## UI Requirements
Only correct ArchForge metadata; generated page may remain until UI tickets.
## State / Data Requirements
None.
## Error Handling
Commands exit non-zero on failures; no ignored test errors.
## Tests
One jsdom smoke test plus successful lint, typecheck, test, and build.
## Acceptance Criteria
All scripts work on a clean checkout and the module skeleton respects documented layers.
## Definition of Done
Four required validation commands pass; ticket status and sprint row are Complete.
## Commit Message
`chore: establish repository validation baseline`
