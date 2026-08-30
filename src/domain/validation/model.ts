import type { Architecture, EntityId } from "@/domain/architecture";
import type { ComponentCatalog, ProviderCatalog } from "@/domain/catalog";
import type { ResolutionEngine } from "@/domain/resolution";

export type ValidationSeverity = "info" | "warning" | "error";

export interface DomainValidationIssue {
  readonly id: EntityId;
  readonly severity: ValidationSeverity;
  readonly rule: string;
  readonly message: string;
  readonly affectedEntityIds: readonly EntityId[];
  readonly suggestedAction: string;
}

export interface ValidationRuleContext {
  readonly architecture: Architecture;
  readonly componentCatalog: ComponentCatalog;
  readonly providerCatalog: ProviderCatalog;
  readonly resolutionEngine: ResolutionEngine;
}

export interface ValidationRule {
  readonly id: string;
  evaluate(context: ValidationRuleContext): readonly DomainValidationIssue[];
}
