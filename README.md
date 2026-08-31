# ArchForge

ArchForge is a local-first architecture workspace for designing systems from
provider-neutral capabilities before choosing technologies or cloud services.
Requirements, constraints, validation evidence, unresolved decisions, and
WebMCP activity stay visible alongside the canonical design.

All architecture data is stored in IndexedDB in the current browser profile.
There is no backend, account, upload, or remote synchronization.

## Requirements

- Node.js 20.9 or newer
- pnpm 10
- A current Chromium-based browser for the supported MVP path

## Run locally

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). The first screen offers
two explicit choices:

- Create an empty architecture and model it yourself.
- Load the sample architecture. This creates a new local record and never
  replaces existing work.

Production verification uses:

```bash
pnpm build
pnpm start
```

## Five-minute demo

1. Select **Load sample architecture**.
2. Review the requirements and constraints in **Design inputs**.
3. Select a canvas node, then open **Resolution** to compare evidence,
   tradeoffs, and still-unresolved provider choices.
4. Review **Validation**. Issues are deterministic and link back to affected
   components.
5. Choose JSON, SVG, or PNG in the command bar and select **Download**. Exports
   are generated locally from the canonical architecture.
6. Reload the page. The architecture persists; selection, viewport, and AI
   activity do not.

On a narrow viewport, use **Inputs** and **Inspector** to open the same controls
as keyboard-accessible dialogs.

## WebMCP support

ArchForge feature-detects the browser's `document.modelContext` API. When that
experimental WebMCP surface is available, it registers strict, versioned tools
for architecture editing, resolution, validation, review, risk analysis,
export, and the high-level `design_system` workflow. Browsers without WebMCP
still support the complete human editing and export path; tool registration is
simply skipped.

WebMCP mutations use the same application command services as the UI. The
**AI activity** panel shows tool provenance, status, affected entities, safe
errors, and workflow grouping. Activity is session-only and is not persisted
with the architecture.

The `design_system` workflow performs a zero-write preflight before sequential
mutations. If a later step fails, earlier writes are retained and the structured
error reports the completed prefix and recovery context; the workflow does not
claim rollback.

## Local data and recovery

- Architectures are stored in the `archforge` IndexedDB database for the
  current origin and browser profile.
- Clearing site data removes local architectures and cannot be undone by the
  app.
- The in-app **Clear** command removes design content only after confirmation
  and preserves the architecture record itself.
- If an unreadable record is detected, ArchForge offers an explicit recovery
  action that removes only corrupt records and preserves valid architectures.
- JSON exports are lossless for the current contract version and can be kept as
  local snapshots. Import is outside the MVP scope.

## Validation

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
```

The Playwright suite runs the configured Chromium MVP path with an isolated
browser context. It covers local design and reload, resolution and download,
WebMCP success/failure visibility, narrow keyboard navigation, and corrupt-data
recovery.

## MVP boundaries

ArchForge does not provide authentication, collaboration, cloud persistence,
deployment, infrastructure-as-code generation, or automatic vendor selection.
Technology and provider scores are advisory; explicit user or agent selections
remain auditable in the canonical architecture.
