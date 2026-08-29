# ArchForge product scope

ArchForge is an AI-native, local-first workspace for designing system architecture with a human or through WebMCP. Its canonical reasoning chain is:

`Requirements -> Capabilities -> Architecture -> Technology -> Provider -> Cloud Service`

Selections are evidence-based and reversible. A semantic database component can exist without a technology, provider, or managed service.

## MVP

- Architecture editor with a canvas projection, component inspector, semantic components, and typed connections.
- Requirements and constraints, including operational preferences and explicit existing infrastructure.
- Capability, technology, AWS/Azure provider, and representative service catalogs.
- Requirement-aware technology and cloud-service suggestions with visible rationale; users make final selections.
- Architecture validation with structured errors, warnings, and actionable guidance.
- Local persistence in IndexedDB, including create, load, update, and clear flows.
- JSON, SVG, and PNG export generated from the canonical model and current visual projection.
- Runtime-validated WebMCP primitive tools for architectures, requirements, components, connections, resolution, analysis, and export.
- A high-level `design_system` WebMCP workflow that composes primitives and reports each mutation.
- Visible AI activity with status, tool name, summary, timestamp, and structured failure details.

The MVP is single-user and browser-local. Catalog breadth is deliberately representative: enough options to demonstrate neutral resolution for common web-system capabilities on AWS and Azure, not exhaustive cloud coverage.

## Out of scope for MVP

- Accounts, authentication, remote APIs, server databases, multi-device sync, real-time collaboration, comments, and permissions.
- Architecture versioning beyond local undo/redo and persistence snapshots.
- Autonomous deployment or generation of Terraform, CDK, Bicep, Kubernetes, or CI/CD pipelines.
- Cost estimation, billing integration, live inventory discovery, cloud credentials, or deployment execution.
- A hosted AI-model backend, fine-tuning, or hidden autonomous changes.
- GCP and broad provider catalogs, exhaustive SKU/region data, and vendor marketplace integrations.

## Post-MVP

Collaboration, durable architecture versions, advanced AI review, cost and operational analysis, infrastructure-as-code generation, deployment workflows, broader provider catalogs, live infrastructure import, and advanced collaboration controls.

## MVP success

A user or agent can describe requirements, build a provider-neutral architecture, model existing constraints, inspect justified AWS/Azure implementation options, validate the design, persist it locally, and export it without any backend dependency.
