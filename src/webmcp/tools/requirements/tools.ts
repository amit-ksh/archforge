import {
  RequirementSchema,
  toArchitectureContract,
  type MutationSummary,
} from "@/application/contracts";
import type { IdGenerator } from "@/application/ports";
import type {
  ArchitectureCommandService,
  ArchitectureService,
} from "@/application/services";
import { DomainError, type Architecture } from "@/domain/architecture";
import { defineWebMcpTool } from "@/webmcp/core";

import {
  AddRequirementToolInputSchema,
  ListRequirementsToolInputSchema,
  RemovedRequirementSchema,
  RemoveRequirementToolInputSchema,
  RequirementListSchema,
  UpdateRequirementToolInputSchema,
} from "./schemas";

export interface RequirementToolDependencies {
  readonly architectureService: ArchitectureService;
  readonly commandService: ArchitectureCommandService;
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

function mutation(
  architecture: Architecture,
  requirementId: string,
  summary: string,
): MutationSummary {
  return {
    behavior: "mutation",
    architectureId: architecture.id,
    revision: architecture.revision,
    affectedIds: [requirementId],
    summary,
  };
}

function requirementFrom(architecture: Architecture, requirementId: string) {
  const requirement = architecture.requirements.find(
    ({ id }) => id === requirementId,
  );
  if (!requirement) {
    throw new DomainError(
      "ENTITY_NOT_FOUND",
      `Requirement '${requirementId}' was not found.`,
    );
  }
  return RequirementSchema.parse(requirement);
}

export function createRequirementTools(
  dependencies: RequirementToolDependencies,
) {
  const { architectureService, commandService, idGenerator } = dependencies;
  return [
    defineWebMcpTool({
      name: "add_requirement",
      title: "Add requirement",
      description: "Add a requirement to an architecture.",
      behavior: "mutation",
      inputSchema: AddRequirementToolInputSchema,
      outputSchema: RequirementSchema,
      async handler({ payload }) {
        const requirementId = idGenerator.next("requirement");
        const architecture = await commandService.execute({
          type: "requirement.add",
          architectureId: payload.architectureId,
          requirement: {
            id: requirementId,
            ...payload.requirement,
            target: payload.requirement.target ?? null,
          },
        });
        const requirement = requirementFrom(architecture, requirementId);
        return {
          value: requirement,
          summary: `Added requirement '${requirement.statement}'.`,
          mutation: mutation(
            architecture,
            requirementId,
            "Added requirement.",
          ),
        };
      },
    }),
    defineWebMcpTool({
      name: "update_requirement",
      title: "Update requirement",
      description: "Update fields on an existing architecture requirement.",
      behavior: "mutation",
      inputSchema: UpdateRequirementToolInputSchema,
      outputSchema: RequirementSchema,
      async handler({ payload }) {
        const architecture = await commandService.execute({
          type: "requirement.update",
          architectureId: payload.architectureId,
          requirementId: payload.requirementId,
          patch: payload.patch,
        });
        const requirement = requirementFrom(
          architecture,
          payload.requirementId,
        );
        return {
          value: requirement,
          summary: `Updated requirement '${requirement.statement}'.`,
          mutation: mutation(
            architecture,
            requirement.id,
            "Updated requirement.",
          ),
        };
      },
    }),
    defineWebMcpTool({
      name: "remove_requirement",
      title: "Remove requirement",
      description: "Remove a requirement from an architecture.",
      behavior: "mutation",
      inputSchema: RemoveRequirementToolInputSchema,
      outputSchema: RemovedRequirementSchema,
      async handler({ payload }) {
        const before = await requireArchitecture(
          architectureService,
          payload.architectureId,
        );
        const requirement = requirementFrom(before, payload.requirementId);
        const architecture = await commandService.execute({
          type: "requirement.remove",
          architectureId: payload.architectureId,
          requirementId: payload.requirementId,
        });
        return {
          value: { removedRequirementId: payload.requirementId },
          summary: `Removed requirement '${requirement.statement}'.`,
          mutation: mutation(
            architecture,
            payload.requirementId,
            "Removed requirement.",
          ),
        };
      },
    }),
    defineWebMcpTool({
      name: "list_requirements",
      title: "List requirements",
      description:
        "List architecture requirements with optional category and priority filters.",
      behavior: "read",
      inputSchema: ListRequirementsToolInputSchema,
      outputSchema: RequirementListSchema,
      async handler({ payload }) {
        const architecture = await requireArchitecture(
          architectureService,
          payload.architectureId,
        );
        const requirements = toArchitectureContract(architecture).requirements.filter(
          (requirement) =>
            (!payload.category || requirement.category === payload.category) &&
            (!payload.priority || requirement.priority === payload.priority),
        );
        return {
          value: requirements,
          summary: `Listed ${requirements.length} requirements.`,
        };
      },
    }),
  ] as const;
}
