# Sprint 01 — MVP implementation

Status values are `Planned`, `In Progress`, and `Complete`. Execution is strictly sequential; start a row only after all dependency rows are complete.

| Order | Ticket | Dependencies | Expected output | Validation command | Status |
| ---: | --- | --- | --- | --- | --- |
| 0 | [000 Repository baseline](tickets/000-repository-baseline.md) | Blueprint commit | Test/typecheck tooling and module skeleton | `pnpm lint && pnpm typecheck && pnpm test && pnpm build` | Complete |
| 1 | [001 Domain model](tickets/001-domain-model.md) | 000 | Canonical aggregate and commands | Full validation + domain tests | Complete |
| 2 | [002 Contract schemas](tickets/002-contract-schemas.md) | 001 | Runtime schemas/result envelopes | Full validation + contract tests | Complete |
| 3 | [003 IndexedDB persistence](tickets/003-indexeddb-persistence.md) | 002 | Repository port and adapters | Full validation + repository contract | Complete |
| 4 | [004 Canvas foundation](tickets/004-canvas-foundation.md) | 003 | Model-driven canvas/editor state | Full validation + editor tests | Complete |
| 5 | [005 Component catalog](tickets/005-component-catalog.md) | 002 | Capability/technology catalog | Full validation + catalog integrity | Complete |
| 6 | [006 Provider catalog](tickets/006-provider-catalog.md) | 005 | AWS/Azure service catalog | Full validation + catalog integrity | Complete |
| 7 | [007 Resolution engine](tickets/007-resolution-engine.md) | 003, 005, 006 | Ranked evidence-based suggestions | Full validation + resolver tests | Complete |
| 8 | [008 Validation engine](tickets/008-validation-engine.md) | 007 | Structured deterministic issues | Full validation + rule tests | Complete |
| 9 | [009 Export engine](tickets/009-export-engine.md) | 004, 008 | JSON/SVG/PNG exporters | Full validation + exporter tests | Complete |
| 10 | [010 WebMCP foundation](tickets/010-webmcp-foundation.md) | 003, 009 | Registration and adapter contracts | Full validation + WebMCP contract tests | Complete |
| 11 | [011 WebMCP architecture tools](tickets/011-webmcp-architecture-tools.md) | 010 | Architecture/requirement tools | Full validation + tool tests | Complete |
| 12 | [012 WebMCP design tools](tickets/012-webmcp-design-tools.md) | 011 | Component/connection tools | Full validation + tool tests | Complete |
| 13 | [013 WebMCP resolution tools](tickets/013-webmcp-resolution-tools.md) | 012 | Catalog/resolution tools | Full validation + tool tests | Complete |
| 14 | [014 WebMCP analysis tools](tickets/014-webmcp-analysis-tools.md) | 013 | Validation/review/risk/export tools | Full validation + tool tests | Complete |
| 15 | [015 Design-system UI](tickets/015-design-system-ui.md) | 004 | Tokens and reusable primitives | Full validation + component tests | Complete |
| 16 | [016 Architecture editor UI](tickets/016-architecture-editor-ui.md) | 008, 015 | Complete editor shell/inspector | Full validation + interaction tests | Complete |
| 17 | [017 Requirements UI](tickets/017-requirements-ui.md) | 016 | Requirement/constraint editing | Full validation + interaction tests | Complete |
| 18 | [018 Technology resolution UI](tickets/018-technology-resolution-ui.md) | 017 | Evidence/tradeoff resolution flow | Full validation + interaction tests | Planned |
| 19 | [019 AI activity UI](tickets/019-ai-activity-ui.md) | 014, 015 | Observable tool activity | Full validation + activity tests | Planned |
| 20 | [020 Design-system workflow](tickets/020-design-system-workflow.md) | 014, 019 | High-level composed WebMCP tool | Full validation + workflow tests | Planned |
| 21 | [021 Integration tests](tickets/021-integration-tests.md) | 020 | Critical integration/E2E journeys | Full validation + `pnpm test:e2e` | Planned |
| 22 | [022 Hackathon polish](tickets/022-hackathon-polish.md) | 021 | Accessible demo-ready MVP | All validation and E2E commands | Planned |

## Blueprint baseline validation

Validated against the untouched Create Next App implementation before the blueprint commit:

- `pnpm lint`: passed.
- `pnpm exec tsc --noEmit`: passed; the named `pnpm typecheck` script is introduced by ticket 000.
- `pnpm build`: passed with Next.js 16.3.3/Turbopack.
- `pnpm test`: unavailable because the generated repository has no test runner or test script; ticket 000 introduces both before product implementation begins.
