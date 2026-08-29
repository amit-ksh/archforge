# WebMCP contract surface

WebMCP is an alternate interface to the same application services used by the UI. Inputs are strict runtime schemas; outputs use the result envelope in `docs/contracts.md`. Every mutation returns the architecture revision and a concise mutation summary. Read tools declare read-only behavior; mutation tools declare their side effects. Tool registration is feature-detected and failure-safe.

## Architecture

- `create_architecture`: accepts name and optional description; returns the new validated architecture.
- `get_architecture`: accepts architecture ID; returns a snapshot or `NOT_FOUND`.
- `update_architecture`: accepts ID plus metadata patch; returns the updated snapshot.
- `clear_architecture`: accepts ID and explicit confirmation; removes all design content while retaining identity.

## Requirements

- `add_requirement`, `update_requirement`, `remove_requirement`: accept architecture ID and the matching requirement payload; return revision and affected requirement.
- `list_requirements`: accepts architecture ID and optional category/priority filters; returns requirements in stable order.

## Components

- `list_component_types`: accepts optional capability category; returns catalog summaries.
- `add_component`, `update_component`, `remove_component`: accept architecture ID and component payload/ID; return revision and affected IDs. Removal reports removed connections.
- `get_component`: returns the component plus connected edges and resolution context.

## Connections

- `connect_components`: accepts architecture ID, endpoint IDs, relationship, and optional label.
- `update_connection`: accepts architecture ID, connection ID, and patch.
- `remove_connection`: accepts architecture ID and connection ID.

## Resolution

- `list_technology_options`: accepts architecture/component IDs and returns compatible catalog options.
- `suggest_implementations`: additionally evaluates requirements, constraints, existing infrastructure, preferences, and optional provider; returns ranked reasons and conflicts without mutating.
- `set_technology`, `set_provider`, `set_cloud_service`: accept explicit selections or `null` to clear; validate compatibility and return the updated component.

## Analysis

- `validate_architecture`: deterministic rule evaluation returning structured issues.
- `review_architecture`: returns a concise review grouped by strengths, gaps, and unresolved decisions; no mutation.
- `find_architecture_risks`: returns risks with severity, evidence, affected entities, and mitigations.

## Export

- `export_json`, `export_svg`, `export_png`: accept architecture ID and format-specific presentation options; return `ExportResultSchema`. The adapter may create a local download URL but never uploads data.

## High-level workflow

`design_system` accepts architecture metadata, requirements/constraints, desired capabilities and connections, existing infrastructure, and optional provider preference. It validates the full request first, then composes primitive application commands in dependency order. It returns executed steps, created/updated IDs, validation issues, unresolved decisions, and final revision. It does not silently select technologies or services when evidence is insufficient. Failures report the completed prefix and failed step; rollback semantics must be explicit before atomic behavior is claimed.

## Errors and observability

Stable codes include `VALIDATION_ERROR`, `NOT_FOUND`, `CONFLICT`, `INCOMPATIBLE_SELECTION`, `PERSISTENCE_ERROR`, `EXPORT_ERROR`, and `UNEXPECTED_ERROR`. Field issues use schema paths. Mutations emit AI activity entries with tool, status, summary, affected IDs, and timestamp; sensitive payloads and stack traces are excluded.
