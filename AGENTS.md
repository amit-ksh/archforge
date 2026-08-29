<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# ArchForge engineering rules

ArchForge is a local-first WebMCP architecture-design web app. Use pnpm, keep persistence in IndexedDB, and treat `docs/product-scope.md` as the MVP boundary.

## Required workflow

1. Read the active file in `docs/tickets/` and every prerequisite it names.
2. Read `docs/architecture.md` for boundaries, `docs/contracts.md` when changing data or tools, `docs/design-system.md` when changing UI, and `docs/webmcp.md` when changing WebMCP.
3. Make one ticket-sized change. Preserve existing work and avoid speculative abstractions.
4. Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`. A ticket is complete only when all four pass and its acceptance criteria are met.
5. Update the ticket status and create one focused conventional commit: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, or `chore:`.

## Boundaries

Dependencies point `UI -> Features -> Application -> Domain`; WebMCP also points `WebMCP -> Application -> Domain`. Infrastructure implements ports owned by inner layers.

- Domain code is framework-free: no React, WebMCP, IndexedDB, canvas libraries, browser APIs, or infrastructure imports.
- WebMCP adapters call typed application services. They use explicit runtime-validated schemas, declare mutation behavior, and return structured results or errors. They never access the DOM or React internals.
- The canonical architecture model is the source of truth. Canvas, inspectors, exports, and AI activity are projections.
- Every mutation is a command handled by an application service. UI and WebMCP share the same command path.
- Domain persistence uses `ArchitectureRepository`; only infrastructure knows IndexedDB.
- Architecture components remain semantic and provider-neutral. Resolve technology, provider, and cloud service from requirements, constraints, operational preferences, catalog data, and explicitly modeled existing infrastructure. Never encode defaults such as database=MongoDB, queue=Kafka, or cache=Redis.

## Contracts and quality

- Keep TypeScript strict. Use schema-first contracts and runtime validation for all external, persisted, imported, and tool input; TypeScript types alone are insufficient.
- Application services and repository ports are typed. Failures cross boundaries as structured errors.
- Cover domain behavior with unit tests, commands with application-service tests, WebMCP with contract tests, boundary composition with integration tests, and critical user journeys with end-to-end tests.
- Reuse semantic design tokens and existing primitives. Add a new primitive only when the design system lacks the needed behavior.
