import { createValidationIssue } from "../issue";
import type {
  ValidationRule,
  ValidationRuleContext,
  ValidationSeverity,
} from "../model";

function coverageSeverity(
  priority: "low" | "medium" | "high" | "critical",
): ValidationSeverity {
  return priority === "high" || priority === "critical" ? "warning" : "info";
}

export const requirementCoverageRule: ValidationRule = {
  id: "requirement.missing-coverage",
  evaluate({ architecture }: ValidationRuleContext) {
    const coveredRequirementIds = new Set(
      architecture.decisions
        .filter(({ status }) => status === "accepted")
        .flatMap(({ evidenceRequirementIds }) => evidenceRequirementIds),
    );
    return architecture.requirements
      .filter(({ id }) => !coveredRequirementIds.has(id))
      .map((requirement) =>
        createValidationIssue({
          rule: this.id,
          discriminator: requirement.id,
          severity: coverageSeverity(requirement.priority),
          message: `${requirement.priority[0].toUpperCase()}${requirement.priority.slice(1)} requirement '${requirement.statement}' is not covered by an accepted decision.`,
          affectedEntityIds: [requirement.id],
          suggestedAction: "Record an accepted decision citing this requirement, or revise the requirement.",
        }),
      );
  },
};
