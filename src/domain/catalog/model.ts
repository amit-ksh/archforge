import type { EntityId } from "@/domain/architecture";

export type CapabilityCategory =
  | "interface"
  | "compute"
  | "data"
  | "messaging"
  | "storage"
  | "security"
  | "observability"
  | "networking";

export interface CapabilityDefinition {
  readonly id: EntityId;
  readonly label: string;
  readonly description: string;
  readonly category: CapabilityCategory;
  readonly iconKey: string;
  readonly connectionRoles: readonly string[];
}

export type OperationalComplexity = "low" | "medium" | "high";
export type ScalingModel = "vertical" | "horizontal" | "elastic";
export type StateModel = "stateless" | "stateful";

export interface TechnologyOperationalTraits {
  readonly complexity: OperationalComplexity;
  readonly scaling: ScalingModel;
  readonly state: StateModel;
  readonly skillTags: readonly string[];
}

export interface TechnologyDefinition {
  readonly id: EntityId;
  readonly label: string;
  readonly description: string;
  readonly capabilityIds: readonly EntityId[];
  readonly useCases: readonly string[];
  readonly strengths: readonly string[];
  readonly tradeoffs: readonly string[];
  readonly operationalTraits: TechnologyOperationalTraits;
}

export interface ComponentCatalogFilter {
  readonly category?: CapabilityCategory;
  readonly capabilityId?: EntityId;
}

export interface ComponentCatalog {
  listCapabilities(filter?: ComponentCatalogFilter): readonly CapabilityDefinition[];
  getCapability(id: EntityId): CapabilityDefinition | null;
  listTechnologies(filter?: ComponentCatalogFilter): readonly TechnologyDefinition[];
  getTechnology(id: EntityId): TechnologyDefinition | null;
}

export interface ProviderDefinition {
  readonly id: EntityId;
  readonly label: string;
  readonly description: string;
  readonly iconKey: string;
}

export type ServiceManagementModel =
  | "serverless"
  | "fully-managed"
  | "managed-platform"
  | "managed-cluster";

export interface CloudServiceDefinition {
  readonly id: EntityId;
  readonly providerId: EntityId;
  readonly label: string;
  readonly description: string;
  readonly capabilityIds: readonly EntityId[];
  readonly compatibleTechnologyIds: readonly EntityId[];
  readonly managementModel: ServiceManagementModel;
  readonly managedServiceContext: string;
  readonly tradeoffs: readonly string[];
}

export interface ProviderCatalogFilter {
  readonly providerId?: EntityId;
  readonly capabilityId?: EntityId;
  readonly technologyId?: EntityId;
}

export interface ProviderCatalog {
  listProviders(): readonly ProviderDefinition[];
  getProvider(id: EntityId): ProviderDefinition | null;
  listServices(filter?: ProviderCatalogFilter): readonly CloudServiceDefinition[];
  getService(id: EntityId): CloudServiceDefinition | null;
}
