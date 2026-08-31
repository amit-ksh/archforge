import type { DesignSystemWorkflowService } from "@/application/services";
import { defineWebMcpTool } from "@/webmcp/core";

import {
  DesignSystemToolInputSchema,
  DesignSystemToolOutputSchema,
} from "./schemas";

export interface DesignSystemToolDependencies {
  readonly designSystemWorkflowService: DesignSystemWorkflowService;
}

export function createDesignSystemWorkflowTools(
  dependencies: DesignSystemToolDependencies,
) {
  return [
    defineWebMcpTool({
      name: "design_system",
      title: "Design system",
      description:
        "Preflight and sequentially construct a provider-neutral architecture from metadata, requirements, constraints, components, connections, and optional explicit resolutions.",
      behavior: "mutation",
      inputSchema: DesignSystemToolInputSchema,
      outputSchema: DesignSystemToolOutputSchema,
      async handler({ payload }, { correlationId }) {
        const result = await dependencies.designSystemWorkflowService.execute(
          payload,
          correlationId,
        );
        return {
          value: DesignSystemToolOutputSchema.parse(result),
          summary: `Designed architecture '${result.architectureId}' in ${result.executedSteps.length} sequential steps with ${result.validationIssues.length} final validation issues.`,
          mutation: {
            behavior: "mutation",
            architectureId: result.architectureId,
            revision: result.finalRevision,
            affectedIds: [...result.affectedIds],
            summary: "Constructed and validated an architecture workflow.",
          },
        };
      },
    }),
  ] as const;
}
