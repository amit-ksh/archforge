# Ticket: AWS and Azure provider catalog

**Status:** Complete

## Objective
Add representative AWS/Azure service mappings without contaminating domain primitives.
## Why
The MVP must resolve neutral designs into provider services after provider selection.
## Prerequisites
Ticket 005.
## Scope
AWS/Azure provider records and representative compute, database, cache, messaging, storage, identity, networking, and observability services.
## Explicitly Out of Scope
GCP, exhaustive SKUs/regions/pricing, live APIs, credentials, and deployment.
## Files / Modules Expected to Change
`src/infrastructure/catalogs/provider-catalog.ts`, service catalog schemas/tests.
## Technical Requirements
Each service references provider, capabilities, compatible technologies, management model, and tradeoffs; mappings remain data-driven.
## API / Contract Requirements
List/get/filter by provider/capability/technology through catalog port.
## UI Requirements
Records expose concise labels and managed-service context.
## State / Data Requirements
Provider and service are separate IDs; selecting a provider never implies a service.
## Error Handling
Reject dangling provider/capability/technology references at startup.
## Tests
Schema/reference integrity, AWS/Azure coverage, compatibility filters, and absence of hidden defaults.
## Acceptance Criteria
The same neutral component can expose distinct compatible AWS and Azure candidates.
## Definition of Done
Provider catalog tests and four validation commands pass; ticket/sprint updated.
## Commit Message
`feat: add aws and azure service catalogs`
