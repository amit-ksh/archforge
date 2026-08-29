# Ticket: WebMCP analysis and export tools

**Status:** Planned

## Objective
Expose deterministic validation, review, risks, and local export through WebMCP.
## Why
Agents need inspectable quality gates and artifact generation.
## Prerequisites
Ticket 013.
## Scope
`validate_architecture`, `review_architecture`, `find_architecture_risks`, `export_json`, `export_svg`, and `export_png`.
## Explicitly Out of Scope
LLM calls, remote review, upload, cost analysis, and high-level design workflow.
## Files / Modules Expected to Change
`src/webmcp/tools/analysis/*`, `export/*`.
## Technical Requirements
Review/risk summaries derive deterministically from issues/decisions; export delegates to exporter port; all are read-only.
## API / Contract Requirements
Match documented issue/risk/export results and media metadata.
## UI Requirements
Activity records successful/failed exports without storing binary payloads.
## State / Data Requirements
No derived analysis is persisted in architecture state.
## Error Handling
Map missing architecture, validation engine, and export adapter failures.
## Tests
Every tool, stable grouping, read-only metadata, JSON/SVG/PNG mapping, invalid options, errors.
## Acceptance Criteria
Fake-host invocations return structured analysis and valid export results without mutation.
## Definition of Done
Tool tests and four validation commands pass; ticket/sprint updated.
## Commit Message
`feat: add webmcp analysis and export tools`
