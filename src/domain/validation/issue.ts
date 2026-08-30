import type { EntityId } from "@/domain/architecture";

import type { DomainValidationIssue, ValidationSeverity } from "./model";

export interface CreateValidationIssueInput {
  readonly rule: string;
  readonly discriminator: string;
  readonly severity: ValidationSeverity;
  readonly message: string;
  readonly affectedEntityIds: readonly EntityId[];
  readonly suggestedAction: string;
}

function stableHash(value: string): string {
  let hash = 2_166_136_261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function uniqueSortedIds(ids: readonly EntityId[]): readonly EntityId[] {
  return [...new Set(ids)].sort((left, right) => left.localeCompare(right, "en"));
}

export function createValidationIssue(
  input: CreateValidationIssueInput,
): DomainValidationIssue {
  const affectedEntityIds = uniqueSortedIds(input.affectedEntityIds);
  if (affectedEntityIds.length === 0) {
    throw new Error("A validation issue requires at least one affected entity.");
  }
  const identity = [
    input.rule,
    input.discriminator,
    ...affectedEntityIds,
  ].join("|");
  return {
    id: `validation-${stableHash(identity)}`,
    severity: input.severity,
    rule: input.rule,
    message: input.message,
    affectedEntityIds,
    suggestedAction: input.suggestedAction,
  };
}

const severityOrder: Readonly<Record<ValidationSeverity, number>> = {
  error: 0,
  warning: 1,
  info: 2,
};

export function sortValidationIssues(
  issues: readonly DomainValidationIssue[],
): readonly DomainValidationIssue[] {
  return [...issues].sort(
    (left, right) =>
      severityOrder[left.severity] - severityOrder[right.severity] ||
      left.rule.localeCompare(right.rule, "en") ||
      left.affectedEntityIds
        .join("|")
        .localeCompare(right.affectedEntityIds.join("|"), "en") ||
      left.id.localeCompare(right.id, "en"),
  );
}
