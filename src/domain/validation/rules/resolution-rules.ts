import type { Constraint, EntityId } from "@/domain/architecture";
import type { ResolutionCandidateKind } from "@/domain/resolution";

import { createValidationIssue } from "../issue";
import type {
  DomainValidationIssue,
  ValidationRule,
  ValidationRuleContext,
} from "../model";

function constraintValues(constraint: Constraint): readonly string[] {
  if (typeof constraint.value === "string") return [constraint.value];
  if (Array.isArray(constraint.value)) return constraint.value;
  return [];
}

export const unresolvedChoicesRule: ValidationRule = {
  id: "resolution.unresolved-choice",
  evaluate({ architecture }: ValidationRuleContext) {
    const issues: DomainValidationIssue[] = [];
    for (const component of architecture.components) {
      if (component.technologyId === null) {
        issues.push(
          createValidationIssue({
            rule: this.id,
            discriminator: `technology:${component.id}`,
            severity: "warning",
            message: `Component '${component.name}' has no selected technology.`,
            affectedEntityIds: [component.id],
            suggestedAction: "Review compatible technologies and make an explicit selection.",
          }),
        );
      }
      if (component.providerId === null) {
        issues.push(
          createValidationIssue({
            rule: this.id,
            discriminator: `provider:${component.id}`,
            severity: "info",
            message: `Component '${component.name}' has no selected provider.`,
            affectedEntityIds: [component.id],
            suggestedAction: "Select a provider when a deployment environment is required.",
          }),
        );
      } else if (component.cloudServiceId === null) {
        issues.push(
          createValidationIssue({
            rule: this.id,
            discriminator: `service:${component.id}`,
            severity: "info",
            message: `Component '${component.name}' has no selected cloud service.`,
            affectedEntityIds: [component.id, component.providerId],
            suggestedAction: "Review compatible managed services or leave the component explicitly self-managed.",
          }),
        );
      }
    }
    return issues;
  },
};

export const incompatibleSelectionsRule: ValidationRule = {
  id: "resolution.incompatible-selection",
  evaluate({ architecture, resolutionEngine }: ValidationRuleContext) {
    const issues: DomainValidationIssue[] = [];
    for (const component of architecture.components) {
      const selections: readonly [
        ResolutionCandidateKind,
        EntityId | null,
      ][] = [
        ["technology", component.technologyId],
        ["provider", component.providerId],
        ["cloud-service", component.cloudServiceId],
      ];
      for (const [candidateKind, candidateId] of selections) {
        if (candidateId === null) continue;
        const error = resolutionEngine.assessSelection(
          architecture,
          component.id,
          candidateKind,
          candidateId,
        );
        if (!error) continue;
        const alternatives = error.viableAlternativeIds.slice(0, 3);
        issues.push(
          createValidationIssue({
            rule: this.id,
            discriminator: `${candidateKind}:${component.id}:${candidateId}`,
            severity: "error",
            message: `${component.name}: ${error.message}`,
            affectedEntityIds: [
              component.id,
              candidateId,
              ...error.evidenceIds,
            ],
            suggestedAction:
              alternatives.length > 0
                ? `Choose a compatible alternative such as ${alternatives.join(", ")}, or clear the selection.`
                : "Clear the selection and resolve it again after addressing the conflicting evidence.",
          }),
        );
      }
    }
    return issues;
  },
};

function candidateKindForConstraint(
  kind: Constraint["kind"],
): ResolutionCandidateKind | null {
  switch (kind) {
    case "provider":
      return "provider";
    case "skill":
    case "operational":
      return "technology";
    default:
      return null;
  }
}

export const unmetConstraintsRule: ValidationRule = {
  id: "constraint.unmet",
  evaluate(context: ValidationRuleContext) {
    const { architecture, componentCatalog, providerCatalog, resolutionEngine } =
      context;
    const issues: DomainValidationIssue[] = [];
    const hardConstraints = architecture.constraints.filter(
      ({ severity }) => severity === "hard",
    );
    const catalogIds = new Set([
      ...componentCatalog.listTechnologies().map(({ id }) => id),
      ...providerCatalog.listProviders().map(({ id }) => id),
      ...providerCatalog.listServices().map(({ id }) => id),
    ]);

    for (const constraint of hardConstraints) {
      const values = constraintValues(constraint);
      if (values.length === 0) {
        issues.push(
          createValidationIssue({
            rule: this.id,
            discriminator: `empty:${constraint.id}`,
            severity: "error",
            message: `Hard constraint '${constraint.statement}' has no machine-evaluable value.`,
            affectedEntityIds: [constraint.id],
            suggestedAction: "Provide an explicit structured value or change it to a preference.",
          }),
        );
        continue;
      }

      if (constraint.kind === "existing-infrastructure") {
        const knownValues = values.filter((value) => catalogIds.has(value));
        const selectedIds = architecture.components.flatMap((component) => [
          component.technologyId,
          component.providerId,
          component.cloudServiceId,
        ]);
        if (knownValues.length === 0) {
          issues.push(
            createValidationIssue({
              rule: this.id,
              discriminator: `unknown-infrastructure:${constraint.id}`,
              severity: "error",
              message: `Existing-infrastructure constraint '${constraint.statement}' references no known catalog entry.`,
              affectedEntityIds: [constraint.id],
              suggestedAction: "Replace stale references with valid technology, provider, or service IDs.",
            }),
          );
        } else if (!knownValues.some((value) => selectedIds.includes(value))) {
          issues.push(
            createValidationIssue({
              rule: this.id,
              discriminator: `unused-infrastructure:${constraint.id}`,
              severity: "error",
              message: `Required existing infrastructure is not used by any component.`,
              affectedEntityIds: [constraint.id, ...knownValues],
              suggestedAction: "Resolve a compatible component to the required infrastructure or revise the constraint.",
            }),
          );
        }
        continue;
      }

      const candidateKind = candidateKindForConstraint(constraint.kind);
      if (candidateKind) {
        for (const component of architecture.components) {
          const result = resolutionEngine.suggest(
            architecture,
            component.id,
            candidateKind,
          );
          const blocksAllCandidates =
            result.candidates.length === 0 &&
            result.conflicts.some(({ evidenceIds }) =>
              evidenceIds.includes(constraint.id),
            );
          if (blocksAllCandidates) {
            issues.push(
              createValidationIssue({
                rule: this.id,
                discriminator: `${constraint.id}:${component.id}:${candidateKind}`,
                severity: "error",
                message: `Hard constraint '${constraint.statement}' leaves '${component.name}' without a compatible ${candidateKind}.`,
                affectedEntityIds: [constraint.id, component.id],
                suggestedAction: "Revise the constraint or add a compatible catalog-backed implementation.",
              }),
            );
          }
        }
        continue;
      }

      if (["budget", "residency", "other"].includes(constraint.kind)) {
        issues.push(
          createValidationIssue({
            rule: this.id,
            discriminator: `manual:${constraint.id}`,
            severity: "warning",
            message: `Hard ${constraint.kind} constraint '${constraint.statement}' requires manual verification.`,
            affectedEntityIds: [constraint.id],
            suggestedAction: "Record verification evidence before trusting or exporting the design.",
          }),
        );
      }
    }
    return issues;
  },
};
