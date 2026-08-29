export type EntityId = string;
export type IsoTimestamp = string;

export type RequirementCategory =
  | "functional"
  | "performance"
  | "reliability"
  | "security"
  | "compliance"
  | "operability"
  | "cost"
  | "other";

export type RequirementPriority = "low" | "medium" | "high" | "critical";

export interface Requirement {
  readonly id: EntityId;
  readonly statement: string;
  readonly category: RequirementCategory;
  readonly priority: RequirementPriority;
  readonly target: string | null;
  readonly createdAt: IsoTimestamp;
  readonly updatedAt: IsoTimestamp;
}

export type ConstraintKind =
  | "provider"
  | "residency"
  | "budget"
  | "skill"
  | "existing-infrastructure"
  | "operational"
  | "other";

export type ConstraintSeverity = "hard" | "preference";
export type ConstraintValue = string | number | boolean | readonly string[];

export interface Constraint {
  readonly id: EntityId;
  readonly kind: ConstraintKind;
  readonly statement: string;
  readonly severity: ConstraintSeverity;
  readonly value: ConstraintValue | null;
  readonly source: string;
  readonly createdAt: IsoTimestamp;
  readonly updatedAt: IsoTimestamp;
}

export interface Position {
  readonly x: number;
  readonly y: number;
}

export interface Component {
  readonly id: EntityId;
  readonly capabilityId: EntityId;
  readonly name: string;
  readonly description: string;
  readonly position: Position;
  readonly existingInfrastructure: boolean;
  readonly technologyId: EntityId | null;
  readonly providerId: EntityId | null;
  readonly cloudServiceId: EntityId | null;
  readonly createdAt: IsoTimestamp;
  readonly updatedAt: IsoTimestamp;
}

export type ConnectionRelationship =
  | "dependency"
  | "request"
  | "data"
  | "event"
  | "control"
  | "other";

export interface Connection {
  readonly id: EntityId;
  readonly sourceComponentId: EntityId;
  readonly targetComponentId: EntityId;
  readonly relationship: ConnectionRelationship;
  readonly label: string;
  readonly createdAt: IsoTimestamp;
  readonly updatedAt: IsoTimestamp;
}

export type DecisionStatus = "proposed" | "accepted" | "rejected";

export interface Decision {
  readonly id: EntityId;
  readonly subjectId: EntityId;
  readonly choiceId: EntityId | null;
  readonly status: DecisionStatus;
  readonly rationale: string;
  readonly evidenceRequirementIds: readonly EntityId[];
  readonly alternativeIds: readonly EntityId[];
  readonly createdAt: IsoTimestamp;
  readonly updatedAt: IsoTimestamp;
}

export interface Technology {
  readonly id: EntityId;
  readonly name: string;
  readonly capabilityIds: readonly EntityId[];
}

export interface Provider {
  readonly id: EntityId;
  readonly name: string;
}

export interface Service {
  readonly id: EntityId;
  readonly name: string;
  readonly providerId: EntityId;
  readonly capabilityIds: readonly EntityId[];
  readonly technologyIds: readonly EntityId[];
}

export interface Architecture {
  readonly id: EntityId;
  readonly name: string;
  readonly description: string;
  readonly requirements: readonly Requirement[];
  readonly constraints: readonly Constraint[];
  readonly components: readonly Component[];
  readonly connections: readonly Connection[];
  readonly decisions: readonly Decision[];
  readonly revision: number;
  readonly createdAt: IsoTimestamp;
  readonly updatedAt: IsoTimestamp;
}
