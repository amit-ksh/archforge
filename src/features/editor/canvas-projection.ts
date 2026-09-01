import type {
  Architecture,
  ConnectionRelationship,
  EntityId,
  Position,
} from "@/domain/architecture";

export interface CanvasNodeProjection {
  readonly id: EntityId;
  readonly name: string;
  readonly capabilityId: EntityId;
  readonly description: string;
  readonly position: Position;
  readonly existingInfrastructure: boolean;
  readonly technologyId: EntityId | null;
  readonly providerId: EntityId | null;
  readonly cloudServiceId: EntityId | null;
  readonly resolutionTrail: readonly EntityId[];
}

export interface CanvasConnectionProjection {
  readonly id: EntityId;
  readonly sourceComponentId: EntityId;
  readonly targetComponentId: EntityId;
  readonly relationship: ConnectionRelationship;
  readonly label: string;
}

export interface CanvasProjection {
  readonly architectureId: EntityId;
  readonly revision: number;
  readonly nodes: readonly CanvasNodeProjection[];
  readonly connections: readonly CanvasConnectionProjection[];
}

export function projectArchitecture(architecture: Architecture): CanvasProjection {
  return {
    architectureId: architecture.id,
    revision: architecture.revision,
    nodes: architecture.components.map((component) => ({
      id: component.id,
      name: component.name,
      capabilityId: component.capabilityId,
      description: component.description,
      position: component.position,
      existingInfrastructure: component.existingInfrastructure,
      technologyId: component.technologyId,
      providerId: component.providerId,
      cloudServiceId: component.cloudServiceId,
      resolutionTrail: [
        component.technologyId,
        component.providerId,
        component.cloudServiceId,
      ].filter((id): id is EntityId => id !== null),
    })),
    connections: architecture.connections.map((connection) => ({
      id: connection.id,
      sourceComponentId: connection.sourceComponentId,
      targetComponentId: connection.targetComponentId,
      relationship: connection.relationship,
      label: connection.label,
    })),
  };
}
