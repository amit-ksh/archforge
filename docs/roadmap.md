# ArchForge implementation roadmap

Milestones are sequential gates. Every milestone inherits the repository validation commands and is complete only after its tickets are committed.

## 0. Repository Baseline

- **Goal:** Make the generated Next.js app a reliable, ticket-driven engineering base.
- **Prerequisites:** Clean Create Next App repository and approved blueprint.
- **Tasks:** Add typecheck/test scripts, Vitest and Playwright configuration, test utilities, app metadata, and module folders.
- **Expected modules:** `package.json`, test configs/setup, `src/{domain,application,infrastructure,features,components,webmcp}`.
- **Tests:** Smoke unit test and production build.
- **Definition of Done:** Four validation commands pass and ticket 000 is committed.

## 1. Domain Model

- **Goal:** Encode the provider-neutral canonical architecture aggregate and commands.
- **Prerequisites:** Milestone 0.
- **Tasks:** Entities, value types, invariants, mutations, structured domain errors, command types.
- **Expected modules:** `src/domain/architecture/*`, `src/application/commands/*`.
- **Tests:** Aggregate unit tests for creation, mutation, cleanup, and rejected invariants.
- **Definition of Done:** Ticket 001 acceptance criteria pass without browser/framework imports in domain.

## 2. Contracts

- **Goal:** Establish runtime-validated boundary schemas and stable result envelopes.
- **Prerequisites:** Domain model.
- **Tasks:** Architecture/entity schemas, tool results/errors, fixtures, mapping.
- **Expected modules:** `src/application/contracts/*`.
- **Tests:** Valid/invalid/round-trip schema fixtures.
- **Definition of Done:** Ticket 002 passes and domain/contracts remain separable.

## 3. Persistence

- **Goal:** Persist validated architectures locally behind an application port.
- **Prerequisites:** Contracts.
- **Tasks:** Repository port, in-memory repository, IndexedDB implementation, migrations, application service.
- **Expected modules:** `src/application/ports`, `src/application/services`, `src/infrastructure/persistence`.
- **Tests:** Repository contract and corrupt-record behavior.
- **Definition of Done:** Ticket 003 passes in memory and fake IndexedDB.

## 4. Canvas

- **Goal:** Render and edit a deterministic projection of the canonical model.
- **Prerequisites:** Persistence and application service.
- **Tasks:** Editor state, node/connection projection, selection, pan/zoom, basic commands.
- **Expected modules:** `src/features/editor`, `src/components/canvas`.
- **Tests:** Projection and interaction tests.
- **Definition of Done:** Ticket 004 passes; canvas contains no alternate domain state.

## 5. Catalogs

- **Goal:** Provide representative capability, technology, AWS, Azure, and service data.
- **Prerequisites:** Domain/contracts.
- **Tasks:** Catalog schemas/ports, capability/technology records, provider/service records.
- **Expected modules:** `src/domain/catalog`, `src/infrastructure/catalogs`.
- **Tests:** Schema, reference-integrity, and compatibility fixtures.
- **Definition of Done:** Tickets 005-006 pass with no implicit vendor defaults.

## 6. Resolution Engine

- **Goal:** Rank compatible implementations using architecture evidence.
- **Prerequisites:** Catalogs and persistence.
- **Tasks:** Filtering, scoring, reason/conflict model, resolution commands.
- **Expected modules:** `src/domain/resolution`, application handlers.
- **Tests:** Determinism, constraints, existing infrastructure, provider preference, ties.
- **Definition of Done:** Ticket 007 passes and suggestions never mutate.

## 7. Validation

- **Goal:** Produce actionable deterministic architecture issues.
- **Prerequisites:** Resolution engine.
- **Tasks:** Rule interface, graph/invariant/resolution rules, issue projection.
- **Expected modules:** `src/domain/validation`.
- **Tests:** Each rule and aggregate ordering/deduplication.
- **Definition of Done:** Ticket 008 passes with stable codes and affected IDs.

## 8. Export

- **Goal:** Export trustworthy JSON, SVG, and PNG locally.
- **Prerequisites:** Validation and canvas projection.
- **Tasks:** Exporter ports, deterministic serializers, browser rasterizer.
- **Expected modules:** `src/application/ports/exporter.ts`, `src/infrastructure/export`.
- **Tests:** JSON round trip, SVG snapshot/escaping, PNG adapter errors.
- **Definition of Done:** Ticket 009 passes and exports never mutate state.

## 9. WebMCP Foundation

- **Goal:** Expose the application through runtime-validated, structured tools.
- **Prerequisites:** Application services, catalogs, validation, export.
- **Tasks:** Browser type declarations, registration adapter, schemas, architecture/design/resolution/analysis tools.
- **Expected modules:** `src/webmcp/*`.
- **Tests:** Registration, validation, mapping, mutation metadata, error envelopes.
- **Definition of Done:** Tickets 010-014 pass with no DOM/React access.

## 10. AI Workflow

- **Goal:** Deliver the full usable editor and observable high-level AI workflow.
- **Prerequisites:** WebMCP foundation and design-system primitives.
- **Tasks:** Design system UI, editor/requirements/resolution/activity surfaces, `design_system` orchestration.
- **Expected modules:** `src/components/ui`, `src/features/*`, `src/webmcp/tools/design-system`.
- **Tests:** Component interactions, workflow prefix failure, activity projection.
- **Definition of Done:** Tickets 015-020 pass and desktop/narrow layouts remain usable.

## 11. Hackathon Polish

- **Goal:** Verify critical journeys and present a resilient, accessible demo.
- **Prerequisites:** Complete MVP workflow.
- **Tasks:** Integration/E2E coverage, accessibility, empty/error/recovery states, README/demo fixtures, performance pass.
- **Expected modules:** `tests/*`, UI polish, `README.md`.
- **Tests:** Ticket 021 journeys plus full validation suite.
- **Definition of Done:** Tickets 021-022 pass; no critical accessibility violations or failing checks.
