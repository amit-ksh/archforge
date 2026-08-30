import { ComponentCatalogRecordsSchema } from "@/application/contracts";
import {
  CatalogInitializationError,
  type CapabilityDefinition,
  type ComponentCatalog,
  type ComponentCatalogFilter,
  type TechnologyDefinition,
} from "@/domain/catalog";
import type { EntityId } from "@/domain/architecture";

import { componentCatalogRecords } from "./component-catalog-data";

function registerUniqueIds(
  records: readonly { readonly id: EntityId }[],
  path: string,
  pathsById: Map<EntityId, string>,
) {
  for (const [index, record] of records.entries()) {
    const recordPath = `${path}.${index}.id`;
    const existingPath = pathsById.get(record.id);
    if (existingPath) {
      throw new CatalogInitializationError(
        `Duplicate catalog ID '${record.id}'; first declared at '${existingPath}'.`,
        recordPath,
      );
    }
    pathsById.set(record.id, recordPath);
  }
}

function sortByLabel<T extends { readonly id: string; readonly label: string }>(
  records: readonly T[],
) {
  return [...records].sort((left, right) => {
    const byLabel = left.label.localeCompare(right.label, "en");
    return byLabel === 0 ? left.id.localeCompare(right.id, "en") : byLabel;
  });
}

function freezeCapability(
  capability: CapabilityDefinition,
): CapabilityDefinition {
  return Object.freeze({
    ...capability,
    connectionRoles: Object.freeze([...capability.connectionRoles]),
  });
}

function freezeTechnology(
  technology: TechnologyDefinition,
): TechnologyDefinition {
  return Object.freeze({
    ...technology,
    capabilityIds: Object.freeze([...technology.capabilityIds]),
    useCases: Object.freeze([...technology.useCases]),
    strengths: Object.freeze([...technology.strengths]),
    tradeoffs: Object.freeze([...technology.tradeoffs]),
    operationalTraits: Object.freeze({
      ...technology.operationalTraits,
      skillTags: Object.freeze([...technology.operationalTraits.skillTags]),
    }),
  });
}

export class StaticComponentCatalog implements ComponentCatalog {
  private readonly capabilities: readonly CapabilityDefinition[];
  private readonly technologies: readonly TechnologyDefinition[];
  private readonly capabilitiesById: ReadonlyMap<EntityId, CapabilityDefinition>;
  private readonly technologiesById: ReadonlyMap<EntityId, TechnologyDefinition>;

  constructor(records: unknown = componentCatalogRecords) {
    const parsed = ComponentCatalogRecordsSchema.safeParse(records);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      throw new CatalogInitializationError(
        issue?.message ?? "Component catalog failed runtime validation.",
        issue?.path.join(".") || "catalog",
        parsed.error,
      );
    }

    const pathsById = new Map<EntityId, string>();
    registerUniqueIds(parsed.data.capabilities, "capabilities", pathsById);
    registerUniqueIds(parsed.data.technologies, "technologies", pathsById);
    const capabilityIds = new Set(
      parsed.data.capabilities.map((capability) => capability.id),
    );
    for (const [technologyIndex, technology] of
      parsed.data.technologies.entries()) {
      for (const [capabilityIndex, capabilityId] of
        technology.capabilityIds.entries()) {
        if (!capabilityIds.has(capabilityId)) {
          throw new CatalogInitializationError(
            `Technology '${technology.id}' references unknown capability '${capabilityId}'.`,
            `technologies.${technologyIndex}.capabilityIds.${capabilityIndex}`,
          );
        }
      }
    }

    this.capabilities = sortByLabel(
      parsed.data.capabilities.map(freezeCapability),
    );
    this.technologies = sortByLabel(
      parsed.data.technologies.map(freezeTechnology),
    );
    this.capabilitiesById = new Map(
      this.capabilities.map((record) => [record.id, record]),
    );
    this.technologiesById = new Map(
      this.technologies.map((record) => [record.id, record]),
    );
  }

  listCapabilities(
    filter: ComponentCatalogFilter = {},
  ): readonly CapabilityDefinition[] {
    return this.capabilities.filter(
      (capability) =>
        (!filter.category || capability.category === filter.category) &&
        (!filter.capabilityId || capability.id === filter.capabilityId),
    );
  }

  getCapability(id: EntityId): CapabilityDefinition | null {
    return this.capabilitiesById.get(id) ?? null;
  }

  listTechnologies(
    filter: ComponentCatalogFilter = {},
  ): readonly TechnologyDefinition[] {
    return this.technologies.filter((technology) => {
      const matchesCapability =
        !filter.capabilityId ||
        technology.capabilityIds.includes(filter.capabilityId);
      if (!matchesCapability || !filter.category) return matchesCapability;
      return technology.capabilityIds.some(
        (id) => this.capabilitiesById.get(id)?.category === filter.category,
      );
    });
  }

  getTechnology(id: EntityId): TechnologyDefinition | null {
    return this.technologiesById.get(id) ?? null;
  }
}
