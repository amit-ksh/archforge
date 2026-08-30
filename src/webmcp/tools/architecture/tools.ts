import {
  toArchitectureContract,
  type MutationSummary,
} from "@/application/contracts";
import type { IdGenerator } from "@/application/ports";
import type {
  ArchitectureCommandService,
  ArchitectureService,
} from "@/application/services";
import { DomainError } from "@/domain/architecture";
import { defineWebMcpTool } from "@/webmcp/core";

import {
  ArchitectureToolOutputSchema,
  ClearArchitectureToolInputSchema,
  CreateArchitectureToolInputSchema,
  GetArchitectureToolInputSchema,
  UpdateArchitectureToolInputSchema,
} from "./schemas";

export interface ArchitectureToolDependencies {
  readonly architectureService: ArchitectureService;
  readonly commandService: ArchitectureCommandService;
  readonly idGenerator: IdGenerator;
}

function mutation(
  architectureId: string,
  revision: number,
  affectedIds: readonly string[],
  summary: string,
): MutationSummary {
  return {
    behavior: "mutation",
    architectureId,
    revision,
    affectedIds: [...affectedIds],
    summary,
  };
}

export function createArchitectureTools(
  dependencies: ArchitectureToolDependencies,
) {
  const { architectureService, commandService, idGenerator } = dependencies;
  return [
    defineWebMcpTool({
      name: "create_architecture",
      title: "Create architecture",
      description:
        "Create an empty provider-neutral architecture in the local workspace.",
      behavior: "mutation",
      inputSchema: CreateArchitectureToolInputSchema,
      outputSchema: ArchitectureToolOutputSchema,
      async handler({ payload }) {
        const architecture = await commandService.execute({
          type: "architecture.create",
          input: {
            id: idGenerator.next("architecture"),
            name: payload.name,
            description: payload.description,
          },
        });
        return {
          value: toArchitectureContract(architecture),
          summary: `Created architecture '${architecture.name}'.`,
          mutation: mutation(
            architecture.id,
            architecture.revision,
            [architecture.id],
            "Created architecture.",
          ),
        };
      },
    }),
    defineWebMcpTool({
      name: "get_architecture",
      title: "Get architecture",
      description: "Get one canonical architecture snapshot by ID.",
      behavior: "read",
      inputSchema: GetArchitectureToolInputSchema,
      outputSchema: ArchitectureToolOutputSchema,
      async handler({ payload }) {
        const architecture = await architectureService.get(payload.architectureId);
        if (!architecture) {
          throw new DomainError(
            "ENTITY_NOT_FOUND",
            `Architecture '${payload.architectureId}' was not found.`,
          );
        }
        return {
          value: toArchitectureContract(architecture),
          summary: `Loaded architecture '${architecture.name}'.`,
        };
      },
    }),
    defineWebMcpTool({
      name: "update_architecture",
      title: "Update architecture",
      description: "Update the name or description of an architecture.",
      behavior: "mutation",
      inputSchema: UpdateArchitectureToolInputSchema,
      outputSchema: ArchitectureToolOutputSchema,
      async handler({ payload }) {
        const architecture = await commandService.execute({
          type: "architecture.update",
          architectureId: payload.architectureId,
          patch: payload.patch,
        });
        return {
          value: toArchitectureContract(architecture),
          summary: `Updated architecture '${architecture.name}'.`,
          mutation: mutation(
            architecture.id,
            architecture.revision,
            [architecture.id],
            "Updated architecture metadata.",
          ),
        };
      },
    }),
    defineWebMcpTool({
      name: "clear_architecture",
      title: "Clear architecture",
      description:
        "Remove all design content from an architecture after explicit confirmation.",
      behavior: "mutation",
      inputSchema: ClearArchitectureToolInputSchema,
      outputSchema: ArchitectureToolOutputSchema,
      async handler({ payload }) {
        const architecture = await commandService.execute({
          type: "architecture.clear",
          architectureId: payload.architectureId,
        });
        return {
          value: toArchitectureContract(architecture),
          summary: `Cleared architecture '${architecture.name}'.`,
          mutation: mutation(
            architecture.id,
            architecture.revision,
            [architecture.id],
            "Cleared architecture content.",
          ),
        };
      },
    }),
  ] as const;
}
