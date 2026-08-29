# Contract and schema strategy

All boundary data is defined schema-first. TypeScript types are inferred from schemas where practical; duplicated handwritten boundary types require parity tests.

> TypeScript types are not sufficient for WebMCP/external input. Runtime validation is mandatory.

## Schemas

- `ArchitectureSchema`: versioned aggregate, metadata, requirements, constraints, components, connections, decisions, and timestamps.
- `RequirementSchema`: ID, statement, category, priority, measurable target, and timestamps.
- `ConstraintSchema`: ID, kind, statement, severity, structured value, and source.
- `ComponentSchema`: ID, capability type, name, description, position, existing-infrastructure flag, and optional resolution references.
- `ConnectionSchema`: ID, source/target IDs, relationship, optional label, and metadata.
- `DecisionSchema`: ID, subject, choice, status, rationale, evidence requirement IDs, alternatives, and timestamp.
- `ToolInputSchema`: common request metadata plus a tool-specific strict payload.
- `ToolResultSchema`: discriminated success/error result with contract version and mutation summary.
- `ErrorSchema`: stable code, message, optional field issues, retryability, and correlation ID; no stack traces.
- `ValidationIssueSchema`: ID, severity, rule, message, affected entity references, and suggested action.
- `ExportResultSchema`: format, filename, media type, encoding/download representation, size, and warnings.

## Rules

- Schemas reject unknown discriminants and malformed IDs; update schemas distinguish omitted fields from explicit clearing.
- Persisted and imported architecture data is validated before domain hydration. WebMCP input is `unknown` until validated.
- Contract versions change when serialized meaning changes. Infrastructure owns migrations between supported persisted versions.
- Domain invariants run after structural validation. Structural failures use `VALIDATION_ERROR`; semantic conflicts use stable domain codes.
- Application results use `{ ok: true, value, mutation? } | { ok: false, error }` at external boundaries.
- Dates cross boundaries as ISO 8601 UTC strings. Catalog and entity references use opaque IDs, not display names.
- Exported JSON includes its schema version and is importable by the same contract version.

## Compatibility testing

Each public schema has valid, invalid, and round-trip fixtures. WebMCP tests assert strict input rejection and exact result envelopes. Persistence tests cover current records, corrupt records, and every supported migration.
