import {
  ComponentSchema,
  ResolutionResultSchema,
  type MutationSummary,
} from "@/application/contracts";
import type { ResolutionService } from "@/application/services";
import {
  DomainError,
  type Architecture,
  type Component,
} from "@/domain/architecture";
import type {
  IncompatibleSelectionError,
  ResolutionCandidateKind,
  ResolutionSelectionResult,
} from "@/domain/resolution";
import { defineWebMcpTool } from "@/webmcp/core";

import {
  ListTechnologyOptionsToolInputSchema,
  SetCloudServiceToolInputSchema,
  SetProviderToolInputSchema,
  SetTechnologyToolInputSchema,
  SuggestImplementationsToolInputSchema,
} from "./schemas";

export interface ResolutionToolDependencies {
  readonly resolutionService: ResolutionService;
}

function throwSelectionError(error: IncompatibleSelectionError): never {
  throw new DomainError("INCOMPATIBLE_SELECTION", error.message, {
    componentId: error.componentId,
    candidateKind: error.candidateKind,
    candidateId: error.candidateId,
    evidenceIds: error.evidenceIds,
    viableAlternativeIds: error.viableAlternativeIds,
  });
}

function selectedArchitecture(result: ResolutionSelectionResult): Architecture {
  if (!result.ok) throwSelectionError(result.error);
  return result.value;
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

function selectionMutation(
  architecture: Architecture,
  componentId: string,
  level: ResolutionCandidateKind,
): MutationSummary {
  return {
    behavior: "mutation",
    architectureId: architecture.id,
    revision: architecture.revision,
    affectedIds: [componentId],
    summary: `Changed component ${level} resolution.`,
  };
}

function selectionSummary(
  level: ResolutionCandidateKind,
  candidateId: string | null,
): string {
  return candidateId
    ? `Set ${level} to '${candidateId}'.`
    : `Cleared ${level} selection.`;
}

export function createResolutionTools(
  dependencies: ResolutionToolDependencies,
) {
  const { resolutionService } = dependencies;
  return [
    defineWebMcpTool({
      name: "list_technology_options",
      title: "List technology options",
      description:
        "List compatible technology choices for a semantic component without scoring or mutation.",
      behavior: "read",
      inputSchema: ListTechnologyOptionsToolInputSchema,
      outputSchema: ResolutionResultSchema,
      async handler({ payload }) {
        const result = await resolutionService.list({
          ...payload,
          candidateKind: "technology",
        });
        return {
          value: ResolutionResultSchema.parse(result),
          summary: `Listed ${result.candidates.length} technology options.`,
        };
      },
    }),
    defineWebMcpTool({
      name: "suggest_implementations",
      title: "Suggest implementations",
      description:
        "Rank compatible technology, provider, or cloud-service candidates using architecture evidence.",
      behavior: "read",
      inputSchema: SuggestImplementationsToolInputSchema,
      outputSchema: ResolutionResultSchema,
      async handler({ payload }) {
        const result = await resolutionService.suggest(payload);
        return {
          value: ResolutionResultSchema.parse(result),
          summary: `Suggested ${result.candidates.length} ${payload.candidateKind} candidates without changing the architecture.`,
        };
      },
    }),
    defineWebMcpTool({
      name: "set_technology",
      title: "Set technology",
      description:
        "Explicitly set or clear the technology selected for a component.",
      behavior: "mutation",
      inputSchema: SetTechnologyToolInputSchema,
      outputSchema: ComponentSchema,
      async handler({ payload }) {
        const architecture = selectedArchitecture(
          await resolutionService.execute({
            type: "resolution.set-technology",
            architectureId: payload.architectureId,
            componentId: payload.componentId,
            technologyId: payload.technologyId,
          }),
        );
        const component = requireComponent(architecture, payload.componentId);
        return {
          value: ComponentSchema.parse(component),
          summary: selectionSummary("technology", payload.technologyId),
          mutation: selectionMutation(
            architecture,
            component.id,
            "technology",
          ),
        };
      },
    }),
    defineWebMcpTool({
      name: "set_provider",
      title: "Set provider",
      description:
        "Explicitly set or clear the provider selected for a component.",
      behavior: "mutation",
      inputSchema: SetProviderToolInputSchema,
      outputSchema: ComponentSchema,
      async handler({ payload }) {
        const architecture = selectedArchitecture(
          await resolutionService.execute({
            type: "resolution.set-provider",
            architectureId: payload.architectureId,
            componentId: payload.componentId,
            providerId: payload.providerId,
          }),
        );
        const component = requireComponent(architecture, payload.componentId);
        return {
          value: ComponentSchema.parse(component),
          summary: selectionSummary("provider", payload.providerId),
          mutation: selectionMutation(
            architecture,
            component.id,
            "provider",
          ),
        };
      },
    }),
    defineWebMcpTool({
      name: "set_cloud_service",
      title: "Set cloud service",
      description:
        "Explicitly set or clear the cloud service selected for a component.",
      behavior: "mutation",
      inputSchema: SetCloudServiceToolInputSchema,
      outputSchema: ComponentSchema,
      async handler({ payload }) {
        const architecture = selectedArchitecture(
          await resolutionService.execute({
            type: "resolution.set-cloud-service",
            architectureId: payload.architectureId,
            componentId: payload.componentId,
            cloudServiceId: payload.cloudServiceId,
          }),
        );
        const component = requireComponent(architecture, payload.componentId);
        return {
          value: ComponentSchema.parse(component),
          summary: selectionSummary("cloud-service", payload.cloudServiceId),
          mutation: selectionMutation(
            architecture,
            component.id,
            "cloud-service",
          ),
        };
      },
    }),
  ] as const;
}
