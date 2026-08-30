import type { ValidationIssue } from "@/application/contracts";
import type { Architecture } from "@/domain/architecture";

import type { ArchitectureReview, ArchitectureRisk } from "./schemas";

export function projectArchitectureReview(
  architecture: Architecture,
  issues: readonly ValidationIssue[],
): ArchitectureReview {
  const strengths: ArchitectureReview["strengths"][number][] = [];
  if (!issues.some(({ severity }) => severity === "error")) {
    strengths.push({
      summary: "No blocking validation errors were found.",
      evidenceIds: [architecture.id],
    });
  }
  if (
    architecture.requirements.length > 0 &&
    !issues.some(({ rule }) => rule === "requirement.missing-coverage")
  ) {
    strengths.push({
      summary: "Modeled requirements have explicit architecture coverage.",
      evidenceIds: architecture.requirements.map(({ id }) => id),
    });
  }
  const acceptedDecisions = architecture.decisions
    .filter(({ status }) => status === "accepted")
    .toSorted((left, right) => left.id.localeCompare(right.id));
  if (acceptedDecisions.length > 0) {
    strengths.push({
      summary: `${acceptedDecisions.length} architecture decisions have accepted rationale.`,
      evidenceIds: acceptedDecisions.map(({ id }) => id),
    });
  }

  const gaps = issues
    .filter(({ severity }) => severity !== "info")
    .map((issue) => ({
      summary: issue.message,
      evidenceIds: issue.affectedEntityIds,
      nextStep: issue.suggestedAction,
    }));
  const unresolvedFromIssues = issues
    .filter(({ rule }) => rule === "resolution.unresolved-choice")
    .map((issue) => ({
      summary: issue.message,
      evidenceIds: issue.affectedEntityIds,
      nextStep: issue.suggestedAction,
    }));
  const unresolvedFromDecisions = architecture.decisions
    .filter(({ status }) => status === "proposed")
    .toSorted((left, right) => left.id.localeCompare(right.id))
    .map((decision) => ({
      summary: `Decision for '${decision.subjectId}' remains proposed.`,
      evidenceIds: [decision.id, decision.subjectId],
      nextStep: "Accept or reject the decision with a recorded rationale.",
    }));

  return {
    strengths,
    gaps,
    unresolvedDecisions: [
      ...unresolvedFromIssues,
      ...unresolvedFromDecisions,
    ],
  };
}

export function projectArchitectureRisks(
  issues: readonly ValidationIssue[],
): readonly ArchitectureRisk[] {
  return issues
    .filter(({ severity }) => severity !== "info")
    .map((issue) => ({
      id: `risk:${issue.id}`,
      severity: issue.severity === "error" ? "high" : "medium",
      evidence: issue.message,
      affectedEntityIds: issue.affectedEntityIds,
      mitigation: issue.suggestedAction,
    }));
}
