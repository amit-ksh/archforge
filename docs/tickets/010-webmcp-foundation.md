# Ticket: WebMCP foundation

**Status:** Complete

## Objective
Create a feature-detected WebMCP adapter and schema-driven tool framework.
## Why
All WebMCP tools need one safe registration, validation, mapping, and observability path.
## Prerequisites
Tickets 003 and 009.
## Scope
Current browser API type declarations, registrar adapter, tool definition helper, strict parsing, result/error mapping, mutation metadata, activity sink, and lifecycle cleanup.
## Explicitly Out of Scope
Individual product tools and any DOM/React automation.
## Files / Modules Expected to Change
`src/webmcp/core/*`, browser declarations, composition registration.
## Technical Requirements
Verify the current WebMCP API from authoritative sources/local types; graceful unsupported-browser behavior; idempotent registration and cleanup.
## API / Contract Requirements
Tool definitions include name, description, input schema, read/mutation declaration, and async handler returning `ToolResultSchema`.
## UI Requirements
None; activity events expose presentation-neutral fields.
## State / Data Requirements
Adapters hold service references, not duplicate architecture state.
## Error Handling
Known errors map to stable codes; unknown errors are sanitized with correlation IDs.
## Tests
Feature detection, registration/cleanup, strict invalid input, success/error mapping, mutation metadata, activity emission.
## Acceptance Criteria
A fake host can register and invoke a sample tool with no WebMCP/DOM imports outside adapter code.
## Definition of Done
Foundation contract tests and four validation commands pass; ticket/sprint updated.
## Commit Message
`feat: establish webmcp tool foundation`
