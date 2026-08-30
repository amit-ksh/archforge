import type { Architecture } from "@/domain/architecture";
import type { ComponentCatalog, ProviderCatalog } from "@/domain/catalog";
import type { ResolutionEngine } from "@/domain/resolution";

import { createValidationIssue, sortValidationIssues } from "./issue";
import type { DomainValidationIssue, ValidationRule } from "./model";
import { builtInValidationRules } from "./rules";

export class ValidationEngine {
  constructor(
    private readonly componentCatalog: ComponentCatalog,
    private readonly providerCatalog: ProviderCatalog,
    private readonly resolutionEngine: ResolutionEngine,
    private readonly rules: readonly ValidationRule[] = builtInValidationRules,
  ) {}

  validate(architecture: Architecture): readonly DomainValidationIssue[] {
    const issues: DomainValidationIssue[] = [];
    for (const rule of this.rules) {
      try {
        issues.push(
          ...rule.evaluate({
            architecture,
            componentCatalog: this.componentCatalog,
            providerCatalog: this.providerCatalog,
            resolutionEngine: this.resolutionEngine,
          }),
        );
      } catch {
        issues.push(
          createValidationIssue({
            rule: "engine.rule-failure",
            discriminator: rule.id,
            severity: "error",
            message: `Validation rule '${rule.id}' could not complete.`,
            affectedEntityIds: [architecture.id],
            suggestedAction: "Retry validation and inspect the rule configuration if the failure persists.",
          }),
        );
      }
    }

    const deduplicated = new Map<string, DomainValidationIssue>();
    for (const issue of issues) {
      if (!deduplicated.has(issue.id)) deduplicated.set(issue.id, issue);
    }
    return sortValidationIssues([...deduplicated.values()]);
  }
}
