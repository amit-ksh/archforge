import type { Architecture, EntityId } from "@/domain/architecture";

import { createValidationIssue } from "../issue";
import type {
  DomainValidationIssue,
  ValidationRule,
  ValidationRuleContext,
} from "../model";

function articulationPoints(architecture: Architecture): readonly EntityId[] {
  const componentIds = new Set(
    architecture.components.map((component) => component.id),
  );
  const adjacency = new Map<EntityId, Set<EntityId>>(
    architecture.components.map(({ id }) => [id, new Set<EntityId>()]),
  );
  for (const connection of architecture.connections) {
    if (
      connection.sourceComponentId === connection.targetComponentId ||
      !componentIds.has(connection.sourceComponentId) ||
      !componentIds.has(connection.targetComponentId)
    ) {
      continue;
    }
    adjacency
      .get(connection.sourceComponentId)
      ?.add(connection.targetComponentId);
    adjacency
      .get(connection.targetComponentId)
      ?.add(connection.sourceComponentId);
  }

  let time = 0;
  const discoveredAt = new Map<EntityId, number>();
  const lowLink = new Map<EntityId, number>();
  const parents = new Map<EntityId, EntityId>();
  const points = new Set<EntityId>();

  function visit(id: EntityId) {
    time += 1;
    discoveredAt.set(id, time);
    lowLink.set(id, time);
    let childCount = 0;
    for (const neighbor of adjacency.get(id) ?? []) {
      if (!discoveredAt.has(neighbor)) {
        childCount += 1;
        parents.set(neighbor, id);
        visit(neighbor);
        lowLink.set(
          id,
          Math.min(lowLink.get(id) ?? time, lowLink.get(neighbor) ?? time),
        );
        const isRoot = !parents.has(id);
        if (
          (isRoot && childCount > 1) ||
          (!isRoot &&
            (lowLink.get(neighbor) ?? time) >=
              (discoveredAt.get(id) ?? time))
        ) {
          points.add(id);
        }
      } else if (parents.get(id) !== neighbor) {
        lowLink.set(
          id,
          Math.min(
            lowLink.get(id) ?? time,
            discoveredAt.get(neighbor) ?? time,
          ),
        );
      }
    }
  }

  for (const { id } of architecture.components) {
    if (!discoveredAt.has(id)) visit(id);
  }
  return [...points].sort((left, right) => left.localeCompare(right, "en"));
}

export const basicResilienceRule: ValidationRule = {
  id: "resilience.basic",
  evaluate({ architecture }: ValidationRuleContext) {
    const reliabilityRequirements = architecture.requirements.filter(
      ({ category, priority }) =>
        category === "reliability" &&
        (priority === "high" || priority === "critical"),
    );
    if (reliabilityRequirements.length === 0) return [];

    const issues: DomainValidationIssue[] = [];
    const requirementIds = reliabilityRequirements.map(({ id }) => id);
    const hasObservability = architecture.components.some(
      ({ capabilityId }) => capabilityId === "capability-observability",
    );
    if (!hasObservability) {
      issues.push(
        createValidationIssue({
          rule: this.id,
          discriminator: "missing-observability",
          severity: "warning",
          message: "High-priority reliability requirements have no observability component.",
          affectedEntityIds: [architecture.id, ...requirementIds],
          suggestedAction: "Add telemetry collection and alerting, then connect it to critical components.",
        }),
      );
    }

    const componentsById = new Map(
      architecture.components.map((component) => [component.id, component]),
    );
    for (const componentId of articulationPoints(architecture)) {
      const component = componentsById.get(componentId);
      if (!component) continue;
      issues.push(
        createValidationIssue({
          rule: this.id,
          discriminator: `articulation:${componentId}`,
          severity: "warning",
          message: `Component '${component.name}' is a single structural path between parts of the architecture.`,
          affectedEntityIds: [componentId, ...requirementIds],
          suggestedAction: "Review redundancy, fallback paths, or failure isolation around this component.",
        }),
      );
    }
    return issues;
  },
};
