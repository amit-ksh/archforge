# Ticket: JSON SVG and PNG export engine

**Status:** Complete

## Objective
Export validated architecture snapshots locally in JSON, SVG, and PNG.
## Why
The MVP must produce portable data and presentation artifacts without a backend.
## Prerequisites
Tickets 004 and 008.
## Scope
Exporter port, canonical JSON serializer, deterministic SVG renderer, browser PNG rasterizer, filenames, media types, and download result mapping.
## Explicitly Out of Scope
PDF, IaC, upload/share links, server rendering, and visual editor mutation.
## Files / Modules Expected to Change
`src/application/ports/exporter.ts`, `src/infrastructure/export/*`.
## Technical Requirements
Escape text, deterministic ordering, embedded metadata, bounded raster scale, object URL cleanup, and no state mutation.
## API / Contract Requirements
Return `ExportResultSchema`; JSON uses current contract version and must reparse.
## UI Requirements
SVG has accessible title/description and legible semantic styling.
## State / Data Requirements
Export accepts immutable architecture plus optional projection settings.
## Error Handling
Map unsupported canvas/blob/download failures to `EXPORT_ERROR`; include validation warnings.
## Tests
JSON round trip, deterministic/escaped SVG, media metadata, PNG adapter success/failure with browser fakes.
## Acceptance Criteria
All formats derive from the same snapshot and JSON is lossless for canonical data.
## Definition of Done
Exporter tests and four validation commands pass; ticket/sprint updated.
## Commit Message
`feat: add architecture export engine`
