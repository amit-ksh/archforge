import {
  CapabilityDefinitionSchema,
  ComponentSchema,
  ConnectionSchema,
  type MutationSummary,
} from "@/application/contracts";
import type { IdGenerator } from "@/application/ports";
import type {
  ArchitectureCommandService,
  ArchitectureService,
} from "@/application/services";
import {
  DomainError,
  type Architecture,
  type Component,
} from "@/domain/architecture";
import type { ComponentCatalog } from "@/domain/catalog";
import { defineWebMcpTool } from "@/webmcp/core";

import {
  AddComponentToolInputSchema,
  ComponentContextSchema,
  ComponentTypeListSchema,
  GetComponentToolInputSchema,
  ListComponentTypesToolInputSchema,
  RemovedComponentSchema,
  RemoveComponentToolInputSchema,
  UpdateComponentToolInputSchema,
} from "./schemas";

export interface ComponentToolDependencies {
  readonly architectureService: ArchitectureService;
  readonly commandService: ArchitectureCommandService;
  readonly componentCatalog: ComponentCatalog;
  readonly idGenerator: IdGenerator;
}

async function requireArchitecture(
  service: ArchitectureService,
  architectureId: string,
): Promise<Architecture> {
  const architecture = await service.get(architectureId);
  if (!architecture) {
    throw new DomainError(
      "ENTITY_NOT_FOUND",
      `Architecture '${architectureId}' was not found.`,
    );
  }
  return architecture;
}

function requireComponent(
  architecture: Architecture,
  componentId: string,
): Component {
  const component = architecture.components.find(({ id }) => id === componentId);
  if (!component) {
    throw new DomainError(
      "ENTITY_NOT_FOUND",
      `Component '${componentId}' was not found.`,
    );
  }
  return component;
}

function requireCapability(catalog: ComponentCatalog, capabilityId: string) {
  if (!catalog.getCapability(capabilityId)) {
    throw new DomainError(
      "INVALID_COMPONENT",
      `Capability '${capabilityId}' is not in the component catalog.`,
      { capabilityId },
    );
  }
}

function mutation(
  architecture: Architecture,
  affectedIds: readonly string[],
  summary: string,
): MutationSummary {
  return {
    behavior: "mutation",
    architectureId: architecture.id,
    revision: architecture.revision,
    affectedIds: [...affectedIds],
    summary,
  };
}

export function createComponentTools(dependencies: ComponentToolDependencies) {
  const {
    architectureService,
    commandService,
    componentCatalog,
    idGenerator,
  } = dependencies;
  return [
    defineWebMcpTool({
      name: "list_component_types",
      title: "List component types",
      description:
        "List provider-neutral architecture capability types from the catalog.",
      behavior: "read",
      inputSchema: ListComponentTypesToolInputSchema,
      outputSchema: ComponentTypeListSchema,
      async handler({ payload }) {
        const capabilities = componentCatalog
          .listCapabilities({ category: payload.category })
          .map((capability) => CapabilityDefinitionSchema.parse(capability));
        return {
          value: capabilities,
          summary: `Listed ${capabilities.length} component types.`,
        };
      },
    }),
    defineWebMcpTool({
      name: "add_component",
      title: "Add component",
      description:
        "Add a provider-neutral semantic component to an architecture.",
      behavior: "mutation",
      inputSchema: AddComponentToolInputSchema,
      outputSchema: ComponentSchema,
      async handler({ payload }) {
        requireCapability(componentCatalog, payload.component.capabilityId);
        const componentId = idGenerator.next("component");
        const architecture = await commandService.execute({
          type: "component.add",
          architectureId: payload.architectureId,
          component: {
            id: componentId,
            capabilityId: payload.component.capabilityId,
            name: payload.component.name,
            description: payload.component.description ?? "",
            position: payload.component.position ?? { x: 0, y: 0 },
            existingInfrastructure:
              payload.component.existingInfrastructure ?? false,
          },
        });
        const component = requireComponent(architecture, componentId);
        return {
          value: ComponentSchema.parse(component),
          summary: `Added component '${component.name}'.`,
          mutation: mutation(architecture, [componentId], "Added component."),
        };
      },
    }),
    defineWebMcpTool({
      name: "get_component",
      title: "Get component",
      description:
        "Get a component with its connected edges and current resolution IDs.",
      behavior: "read",
      inputSchema: GetComponentToolInputSchema,
      outputSchema: ComponentContextSchema,
      async handler({ payload }) {
        const architecture = await requireArchitecture(
          architectureService,
          payload.architectureId,
        );
        const component = requireComponent(architecture, payload.componentId);
        const connections = architecture.connections
          .filter(
            (connection) =>
              connection.sourceComponentId === component.id ||
              connection.targetComponentId === component.id,
          )
          .map((connection) => ConnectionSchema.parse(connection));
        return {
          value: {
            component: ComponentSchema.parse(component),
            connections,
            resolution: {
              technologyId: component.technologyId,
              providerId: component.providerId,
              cloudServiceId: component.cloudServiceId,
            },
          },
          summary: `Loaded component '${component.name}'.`,
        };
      },
    }),
    defineWebMcpTool({
      name: "update_component",
      title: "Update component",
      description:
        "Update semantic fields or the canonical position of a component.",
      behavior: "mutation",
      inputSchema: UpdateComponentToolInputSchema,
      outputSchema: ComponentSchema,
      async handler({ payload }) {
        if (payload.patch.capabilityId) {
          requireCapability(componentCatalog, payload.patch.capabilityId);
        }
        const architecture = await commandService.execute({
          type: "component.update",
          architectureId: payload.architectureId,
          componentId: payload.componentId,
          patch: payload.patch,
        });
        const component = requireComponent(architecture, payload.componentId);
        return {
          value: ComponentSchema.parse(component),
          summary: `Updated component '${component.name}'.`,
          mutation: mutation(
            architecture,
            [component.id],
            "Updated component.",
          ),
        };
      },
    }),
    defineWebMcpTool({
      name: "remove_component",
      title: "Remove component",
      description:
        "Remove a component and report connections removed by the cascade.",
      behavior: "mutation",
      inputSchema: RemoveComponentToolInputSchema,
      outputSchema: RemovedComponentSchema,
      async handler({ payload }) {
        const before = await requireArchitecture(
          architectureService,
          payload.architectureId,
        );
        const component = requireComponent(before, payload.componentId);
        const removedConnectionIds = before.connections
          .filter(
            (connection) =>
              connection.sourceComponentId === component.id ||
              connection.targetComponentId === component.id,
          )
          .map(({ id }) => id);
        const architecture = await commandService.execute({
          type: "component.remove",
          architectureId: payload.architectureId,
          componentId: payload.componentId,
        });
        return {
          value: {
            removedComponentId: component.id,
            removedConnectionIds,
          },
          summary: `Removed component '${component.name}'.`,
          mutation: mutation(
            architecture,
            [component.id, ...removedConnectionIds],
            "Removed component and connected edges.",
          ),
        };
      },
    }),
  ] as const;
}
