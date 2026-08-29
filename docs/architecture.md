# Technical architecture

## System layers

| Layer | Responsibility |
| --- | --- |
| UI | Accessible React rendering and browser interaction. |
| Features | Editor workflows and view-model composition. |
| Application | Commands, queries, orchestration, ports, and transaction boundaries. |
| Domain | Canonical architecture model, invariants, resolution concepts, and validation rules. |
| Infrastructure | IndexedDB repositories, catalogs, export adapters, IDs, and clocks. |
| WebMCP | Runtime-validated tool adapters mapped to application services. |

Dependencies point inward: `UI -> Features -> Application -> Domain` and `WebMCP -> Application -> Domain`. Infrastructure implements ports declared by inner layers and is wired at the composition root.

Forbidden dependencies are `Domain -> React`, `Domain -> WebMCP`, `Domain -> IndexedDB`, `Domain -> canvas library`, `WebMCP -> DOM`, and `WebMCP -> React component`. Feature code may not bypass application services to write persistence.

## Domain model

- `Architecture`: aggregate root containing identity, metadata, requirements, constraints, components, connections, decisions, and revision timestamps.
- `Requirement`: desired quality or behavior with category, priority, and optional measurable target.
- `Constraint`: a non-negotiable boundary such as provider, residency, budget posture, skill, or existing infrastructure.
- `Component`: provider-neutral capability instance with position and optional technology/provider/service resolution.
- `Connection`: directed semantic relationship between two components.
- `Decision`: auditable selection or rejection with rationale and requirement references.
- `Technology`: deployable implementation technology independent of cloud provider.
- `Provider`: execution environment such as AWS or Azure.
- `Service`: provider-managed realization of a capability or technology.

IDs are opaque strings. Aggregate operations enforce unique IDs, valid endpoints, no self-connections, and removal cleanup. Resolution fields are independently optional so a component can progress from capability to technology to provider to service without collapsing those concepts.

## State model

- **Architecture State** is durable canonical data and the source of truth.
- **Editor State** is ephemeral projection state: viewport, selection, open panels, draft input, and minimap visibility.
- **History State** stores reversible canonical command snapshots or patches. It is separate from persisted domain state and never becomes an alternate model.

## Commands and queries

All mutations are explicit discriminated commands handled by typed application services:

`AddComponentCommand`, `UpdateComponentCommand`, `RemoveComponentCommand`, `ConnectComponentsCommand`, `UpdateConnectionCommand`, `RemoveConnectionCommand`, `AddRequirementCommand`, `UpdateRequirementCommand`, `RemoveRequirementCommand`, `SetTechnologyCommand`, `SetProviderCommand`, and `SetCloudServiceCommand`.

Architecture creation, metadata update, and clearing use the same command pipeline. Command handlers load the aggregate, execute one domain operation, persist the resulting aggregate, and return a structured result. Queries never mutate. UI and WebMCP dispatch identical commands.

## Persistence

`ArchitectureRepository` is an application port with list, get, save, and delete operations. `IndexedDbArchitectureRepository` is its browser implementation. Persisted records are runtime-validated and versioned before entering the domain. Schema migration belongs to infrastructure. Tests use an in-memory implementation of the same port.

## Catalogs

- Capability catalog describes semantic component types and allowed connection roles.
- Technology catalog maps capabilities to technologies with use-case, constraint, and operational metadata.
- Provider catalog describes AWS and Azure.
- Service catalog maps provider services to capabilities and compatible technologies.

Catalog records are immutable inputs, runtime-validated on load, and independent from the architecture aggregate.

## Resolution engine

The resolver accepts one component plus architecture context. It filters incompatible options, then scores remaining options using referenced requirements, hard constraints, modeled existing infrastructure, operational preferences, and selected provider. Results contain candidate IDs, score bands, reasons, tradeoffs, and blocking conflicts. A score is advisory and deterministic; the resolver never mutates the architecture or silently chooses a vendor. Explicit user choices remain until invalidated by a changed hard constraint, which is surfaced as validation rather than overwritten.

## WebMCP

The browser composition root registers tools from `docs/webmcp.md` when WebMCP is available. Each adapter defines an input schema, validates unknown input, calls an application command/query, and maps the result to a versioned output schema. Mutation metadata is explicit. Known domain and validation failures become structured errors; unexpected failures are sanitized and retain a correlation identifier. Tool adapters contain no UI logic.

## Export

- JSON serializes a versioned, validated architecture contract.
- SVG renders a deterministic accessible vector projection with embedded architecture metadata.
- PNG rasterizes the SVG projection in the browser.

Exporters consume snapshots; they never mutate domain or editor state. Export results contain format, filename, media type, and payload/download metadata or a structured error.

## Composition

The client feature composition root owns the repository, catalogs, clock/ID adapters, application service, editor store, exporters, and WebMCP registration. React receives services through a narrow provider. This keeps domain and application tests independent of the browser and canvas implementation.
