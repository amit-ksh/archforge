import type { Architecture, EntityId } from "@/domain/architecture";

import { createValidationIssue } from "../issue";
import type {
  DomainValidationIssue,
  ValidationRule,
  ValidationRuleContext,
} from "../model";

function canonicalIds(architecture: Architecture): readonly EntityId[] {
  return [
    architecture.id,
    ...architecture.requirements.map(({ id }) => id),
    ...architecture.constraints.map(({ id }) => id),
    ...architecture.components.map(({ id }) => id),
    ...architecture.connections.map(({ id }) => id),
    ...architecture.decisions.map(({ id }) => id),
  ];
}

export const graphIntegrityRule: ValidationRule = {
  id: "graph.integrity",
  evaluate({ architecture, componentCatalog }: ValidationRuleContext) {
    const issues: DomainValidationIssue[] = [];
    const idCounts = new Map<EntityId, number>();
    for (const id of canonicalIds(architecture)) {
      idCounts.set(id, (idCounts.get(id) ?? 0) + 1);
    }
    for (const [id, count] of idCounts) {
      if (count > 1) {
        issues.push(
          createValidationIssue({
            rule: this.id,
            discriminator: `duplicate-id:${id}`,
            severity: "error",
            message: `Entity ID '${id}' is used ${count} times.`,
            affectedEntityIds: [architecture.id, id],
            suggestedAction: "Assign a unique ID to every canonical entity.",
          }),
        );
      }
    }

    const componentIds = new Set(
      architecture.components.map((component) => component.id),
    );
    for (const component of architecture.components) {
      if (!componentCatalog.getCapability(component.capabilityId)) {
        issues.push(
          createValidationIssue({
            rule: this.id,
            discriminator: `missing-capability:${component.id}`,
            severity: "error",
            message: `Component '${component.name}' references an unknown capability.`,
            affectedEntityIds: [component.id, component.capabilityId],
            suggestedAction: "Choose a valid capability or restore the missing catalog entry.",
          }),
        );
      }
    }
    const edgeKeys = new Map<string, EntityId>();
    for (const connection of architecture.connections) {
      const missingIds = [
        connection.sourceComponentId,
        connection.targetComponentId,
      ].filter((id) => !componentIds.has(id));
      if (missingIds.length > 0) {
        issues.push(
          createValidationIssue({
            rule: this.id,
            discriminator: `missing-endpoint:${connection.id}`,
            severity: "error",
            message: `Connection '${connection.id}' references a missing component endpoint.`,
            affectedEntityIds: [connection.id, ...missingIds],
            suggestedAction: "Reconnect it to existing components or remove the connection.",
          }),
        );
      }
      if (connection.sourceComponentId === connection.targetComponentId) {
        issues.push(
          createValidationIssue({
            rule: this.id,
            discriminator: `self-edge:${connection.id}`,
            severity: "error",
            message: `Connection '${connection.id}' connects a component to itself.`,
            affectedEntityIds: [connection.id, connection.sourceComponentId],
            suggestedAction: "Choose a different target component or remove the connection.",
          }),
        );
      }

      const edgeKey = [
        connection.sourceComponentId,
        connection.targetComponentId,
        connection.relationship,
      ].join("|");
      const existingConnectionId = edgeKeys.get(edgeKey);
      if (existingConnectionId) {
        issues.push(
          createValidationIssue({
            rule: this.id,
            discriminator: `duplicate-edge:${edgeKey}`,
            severity: "warning",
            message: "Multiple connections describe the same directed relationship.",
            affectedEntityIds: [existingConnectionId, connection.id],
            suggestedAction: "Keep one connection or give each connection a distinct semantic role.",
          }),
        );
      } else {
        edgeKeys.set(edgeKey, connection.id);
      }
    }

    const decisionSubjectIds = new Set([
      architecture.id,
      ...architecture.requirements.map(({ id }) => id),
      ...architecture.constraints.map(({ id }) => id),
      ...architecture.components.map(({ id }) => id),
      ...architecture.connections.map(({ id }) => id),
    ]);
    const requirementIds = new Set(
      architecture.requirements.map(({ id }) => id),
    );
    for (const decision of architecture.decisions) {
      if (!decisionSubjectIds.has(decision.subjectId)) {
        issues.push(
          createValidationIssue({
            rule: this.id,
            discriminator: `decision-subject:${decision.id}`,
            severity: "error",
            message: `Decision '${decision.id}' references a missing subject.`,
            affectedEntityIds: [decision.id, decision.subjectId],
            suggestedAction: "Retarget the decision to an existing entity or remove it.",
          }),
        );
      }
      const missingEvidenceIds = decision.evidenceRequirementIds.filter(
        (id) => !requirementIds.has(id),
      );
      if (missingEvidenceIds.length > 0) {
        issues.push(
          createValidationIssue({
            rule: this.id,
            discriminator: `decision-evidence:${decision.id}`,
            severity: "error",
            message: `Decision '${decision.id}' references missing requirement evidence.`,
            affectedEntityIds: [decision.id, ...missingEvidenceIds],
            suggestedAction: "Remove stale evidence references or restore the requirements.",
          }),
        );
      }
    }
    return issues;
  },
};

export const orphanComponentRule: ValidationRule = {
  id: "graph.orphan-component",
  evaluate({ architecture }: ValidationRuleContext) {
    if (architecture.components.length < 2) return [];
    const connectedIds = new Set(
      architecture.connections.flatMap((connection) => [
        connection.sourceComponentId,
        connection.targetComponentId,
      ]),
    );
    return architecture.components
      .filter(({ id }) => !connectedIds.has(id))
      .map((component) =>
        createValidationIssue({
          rule: this.id,
          discriminator: component.id,
          severity: "warning",
          message: `Component '${component.name}' is not connected to the architecture graph.`,
          affectedEntityIds: [component.id],
          suggestedAction: "Connect the component to its consumers or dependencies, or remove it.",
        }),
      );
  },
};
