import { ProviderCatalogRecordsSchema } from "@/application/contracts";
import type { EntityId } from "@/domain/architecture";
import {
  CatalogInitializationError,
  type CloudServiceDefinition,
  type ComponentCatalog,
  type ProviderCatalog,
  type ProviderCatalogFilter,
  type ProviderDefinition,
} from "@/domain/catalog";

import { StaticComponentCatalog } from "./component-catalog";
import { providerCatalogRecords } from "./provider-catalog-data";

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

function freezeProvider(provider: ProviderDefinition): ProviderDefinition {
  return Object.freeze({ ...provider });
}

function freezeService(service: CloudServiceDefinition): CloudServiceDefinition {
  return Object.freeze({
    ...service,
    capabilityIds: Object.freeze([...service.capabilityIds]),
    compatibleTechnologyIds: Object.freeze([
      ...service.compatibleTechnologyIds,
    ]),
    tradeoffs: Object.freeze([...service.tradeoffs]),
  });
}

export class StaticProviderCatalog implements ProviderCatalog {
  private readonly providers: readonly ProviderDefinition[];
  private readonly services: readonly CloudServiceDefinition[];
  private readonly providersById: ReadonlyMap<EntityId, ProviderDefinition>;
  private readonly servicesById: ReadonlyMap<EntityId, CloudServiceDefinition>;

  constructor(
    records: unknown = providerCatalogRecords,
    componentCatalog: ComponentCatalog = new StaticComponentCatalog(),
  ) {
    const parsed = ProviderCatalogRecordsSchema.safeParse(records);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      throw new CatalogInitializationError(
        issue?.message ?? "Provider catalog failed runtime validation.",
        issue?.path.join(".") || "catalog",
        parsed.error,
      );
    }

    const pathsById = new Map<EntityId, string>();
    registerUniqueIds(parsed.data.providers, "providers", pathsById);
    registerUniqueIds(parsed.data.services, "services", pathsById);
    const providerIds = new Set(
      parsed.data.providers.map((provider) => provider.id),
    );

    for (const [serviceIndex, service] of parsed.data.services.entries()) {
      if (!providerIds.has(service.providerId)) {
        throw new CatalogInitializationError(
          `Service '${service.id}' references unknown provider '${service.providerId}'.`,
          `services.${serviceIndex}.providerId`,
        );
      }

      for (const [capabilityIndex, capabilityId] of
        service.capabilityIds.entries()) {
        if (!componentCatalog.getCapability(capabilityId)) {
          throw new CatalogInitializationError(
            `Service '${service.id}' references unknown capability '${capabilityId}'.`,
            `services.${serviceIndex}.capabilityIds.${capabilityIndex}`,
          );
        }
      }

      for (const [technologyIndex, technologyId] of
        service.compatibleTechnologyIds.entries()) {
        const technology = componentCatalog.getTechnology(technologyId);
        if (!technology) {
          throw new CatalogInitializationError(
            `Service '${service.id}' references unknown technology '${technologyId}'.`,
            `services.${serviceIndex}.compatibleTechnologyIds.${technologyIndex}`,
          );
        }
        if (
          !technology.capabilityIds.some((capabilityId) =>
            service.capabilityIds.includes(capabilityId),
          )
        ) {
          throw new CatalogInitializationError(
            `Service '${service.id}' lists technology '${technologyId}' without a shared capability.`,
            `services.${serviceIndex}.compatibleTechnologyIds.${technologyIndex}`,
          );
        }
      }
    }

    this.providers = sortByLabel(parsed.data.providers.map(freezeProvider));
    this.services = sortByLabel(parsed.data.services.map(freezeService));
    this.providersById = new Map(
      this.providers.map((provider) => [provider.id, provider]),
    );
    this.servicesById = new Map(
      this.services.map((service) => [service.id, service]),
    );
  }

  listProviders(): readonly ProviderDefinition[] {
    return this.providers;
  }

  getProvider(id: EntityId): ProviderDefinition | null {
    return this.providersById.get(id) ?? null;
  }

  listServices(
    filter: ProviderCatalogFilter = {},
  ): readonly CloudServiceDefinition[] {
    return this.services.filter(
      (service) =>
        (!filter.providerId || service.providerId === filter.providerId) &&
        (!filter.capabilityId ||
          service.capabilityIds.includes(filter.capabilityId)) &&
        (!filter.technologyId ||
          service.compatibleTechnologyIds.includes(filter.technologyId)),
    );
  }

  getService(id: EntityId): CloudServiceDefinition | null {
    return this.servicesById.get(id) ?? null;
  }
}
