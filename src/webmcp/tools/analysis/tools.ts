import type {
  ArchitectureService,
  ValidationService,
} from "@/application/services";
import { DomainError } from "@/domain/architecture";
import { defineWebMcpTool } from "@/webmcp/core";

import { projectArchitectureReview, projectArchitectureRisks } from "./projections";
import {
  ArchitectureAnalysisToolInputSchema,
  ArchitectureReviewSchema,
  ArchitectureRiskListSchema,
  ValidationIssueListSchema,
} from "./schemas";

export interface AnalysisToolDependencies {
  readonly architectureService: ArchitectureService;
  readonly validationService: ValidationService;
}

export function createAnalysisTools(dependencies: AnalysisToolDependencies) {
  const { architectureService, validationService } = dependencies;

  async function loadArchitectureAndIssues(architectureId: string) {
    const [architecture, issues] = await Promise.all([
      architectureService.get(architectureId),
      validationService.validate(architectureId),
    ]);
    if (!architecture) {
      throw new DomainError(
        "ENTITY_NOT_FOUND",
        `Architecture '${architectureId}' was not found.`,
      );
    }
    return { architecture, issues };
  }

  return [
    defineWebMcpTool({
      name: "validate_architecture",
      title: "Validate architecture",
      description:
        "Run deterministic architecture validation and return actionable issues.",
      behavior: "read",
      inputSchema: ArchitectureAnalysisToolInputSchema,
      outputSchema: ValidationIssueListSchema,
      async handler({ payload }) {
        const issues = await validationService.validate(payload.architectureId);
        return {
          value: [...issues],
          summary: `Validation found ${issues.length} issues.`,
        };
      },
    }),
    defineWebMcpTool({
      name: "review_architecture",
      title: "Review architecture",
      description:
        "Summarize deterministic strengths, gaps, and unresolved decisions.",
      behavior: "read",
      inputSchema: ArchitectureAnalysisToolInputSchema,
      outputSchema: ArchitectureReviewSchema,
      async handler({ payload }) {
        const { architecture, issues } = await loadArchitectureAndIssues(
          payload.architectureId,
        );
        const review = projectArchitectureReview(architecture, issues);
        return {
          value: review,
          summary: `Reviewed architecture '${architecture.name}' with ${review.gaps.length} gaps.`,
        };
      },
    }),
    defineWebMcpTool({
      name: "find_architecture_risks",
      title: "Find architecture risks",
      description:
        "Project architecture risks and mitigations from deterministic validation evidence.",
      behavior: "read",
      inputSchema: ArchitectureAnalysisToolInputSchema,
      outputSchema: ArchitectureRiskListSchema,
      async handler({ payload }) {
        const { architecture, issues } = await loadArchitectureAndIssues(
          payload.architectureId,
        );
        const risks = projectArchitectureRisks(issues);
        return {
          value: [...risks],
          summary: `Found ${risks.length} risks for '${architecture.name}'.`,
        };
      },
    }),
  ] as const;
}
