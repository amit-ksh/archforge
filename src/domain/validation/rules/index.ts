import type { ValidationRule } from "../model";
import { graphIntegrityRule, orphanComponentRule } from "./graph-rules";
import { requirementCoverageRule } from "./requirement-rules";
import { basicResilienceRule } from "./resilience-rules";
import {
  incompatibleSelectionsRule,
  unmetConstraintsRule,
  unresolvedChoicesRule,
} from "./resolution-rules";

export const builtInValidationRules: readonly ValidationRule[] = [
  graphIntegrityRule,
  orphanComponentRule,
  unresolvedChoicesRule,
  incompatibleSelectionsRule,
  unmetConstraintsRule,
  requirementCoverageRule,
  basicResilienceRule,
];

export {
  basicResilienceRule,
  graphIntegrityRule,
  incompatibleSelectionsRule,
  orphanComponentRule,
  requirementCoverageRule,
  unmetConstraintsRule,
  unresolvedChoicesRule,
};
