import { DomainError } from "./errors";
import type {
  Architecture,
  Component,
  Connection,
  Constraint,
  EntityId,
  IsoTimestamp,
  Requirement,
} from "./model";

export interface CreateArchitectureInput {
  readonly id: EntityId;
  readonly name: string;
  readonly description?: string;
}

export type UpdateArchitecturePatch = Readonly<{
  name?: string;
  description?: string;
}>;

export type AddRequirementInput = Omit<Requirement, "createdAt" | "updatedAt">;
export type UpdateRequirementPatch = Partial<
  Pick<Requirement, "statement" | "category" | "priority" | "target">
>;

export type AddConstraintInput = Omit<Constraint, "createdAt" | "updatedAt">;
export type UpdateConstraintPatch = Partial<
  Pick<Constraint, "kind" | "statement" | "severity" | "value" | "source">
>;

export type AddComponentInput = Omit<
  Component,
  "createdAt" | "updatedAt" | "technologyId" | "providerId" | "cloudServiceId"
> &
  Partial<
    Pick<Component, "technologyId" | "providerId" | "cloudServiceId">
  >;

export type UpdateComponentPatch = Partial<
  Pick<
    Component,
    | "capabilityId"
    | "name"
    | "description"
    | "position"
    | "existingInfrastructure"
  >
>;

export type ConnectComponentsInput = Omit<
  Connection,
  "createdAt" | "updatedAt"
>;
export type UpdateConnectionPatch = Partial<
  Pick<
    Connection,
    "sourceComponentId" | "targetComponentId" | "relationship" | "label"
  >
>;

function requireText(value: string, field: string, code: DomainError["code"]) {
  if (value.trim().length === 0) {
    throw new DomainError(code, `${field} must not be empty.`, { field });
  }
}

function allEntityIds(architecture: Architecture): readonly EntityId[] {
  return [
    architecture.id,
    ...architecture.requirements.map(({ id }) => id),
    ...architecture.constraints.map(({ id }) => id),
    ...architecture.components.map(({ id }) => id),
    ...architecture.connections.map(({ id }) => id),
    ...architecture.decisions.map(({ id }) => id),
  ];
}

function assertNewId(architecture: Architecture, id: EntityId) {
  requireText(id, "id", "DUPLICATE_ID");
  if (allEntityIds(architecture).includes(id)) {
    throw new DomainError("DUPLICATE_ID", `Entity '${id}' already exists.`, {
      id,
    });
  }
}

function findIndex<T extends { readonly id: EntityId }>(
  values: readonly T[],
  id: EntityId,
  entity: string,
) {
  const index = values.findIndex((value) => value.id === id);
  if (index === -1) {
    throw new DomainError("ENTITY_NOT_FOUND", `${entity} '${id}' was not found.`, {
      entity,
      id,
    });
  }
  return index;
}

function replaceAt<T>(values: readonly T[], index: number, value: T): readonly T[] {
  return values.map((current, currentIndex) =>
    currentIndex === index ? value : current,
  );
}

function bump(
  architecture: Architecture,
  at: IsoTimestamp,
  changes: Partial<Architecture>,
): Architecture {
  return {
    ...architecture,
    ...changes,
    revision: architecture.revision + 1,
    updatedAt: at,
  };
}

function componentExists(architecture: Architecture, id: EntityId) {
  return architecture.components.some((component) => component.id === id);
}

function validateConnection(
  architecture: Architecture,
  sourceComponentId: EntityId,
  targetComponentId: EntityId,
) {
  if (sourceComponentId === targetComponentId) {
    throw new DomainError(
      "INVALID_CONNECTION",
      "A component cannot connect to itself.",
      { sourceComponentId, targetComponentId },
    );
  }
  for (const id of [sourceComponentId, targetComponentId]) {
    if (!componentExists(architecture, id)) {
      throw new DomainError(
        "INVALID_CONNECTION",
        `Connection endpoint '${id}' was not found.`,
        { componentId: id },
      );
    }
  }
}

export function createArchitecture(
  input: CreateArchitectureInput,
  at: IsoTimestamp,
): Architecture {
  requireText(input.id, "id", "INVALID_ARCHITECTURE");
  requireText(input.name, "name", "INVALID_ARCHITECTURE");
  return {
    id: input.id,
    name: input.name.trim(),
    description: input.description?.trim() ?? "",
    requirements: [],
    constraints: [],
    components: [],
    connections: [],
    decisions: [],
    revision: 0,
    createdAt: at,
    updatedAt: at,
  };
}

export function updateArchitecture(
  architecture: Architecture,
  patch: UpdateArchitecturePatch,
  at: IsoTimestamp,
): Architecture {
  const name = patch.name === undefined ? architecture.name : patch.name.trim();
  requireText(name, "name", "INVALID_ARCHITECTURE");
  return bump(architecture, at, {
    name,
    description:
      patch.description === undefined
        ? architecture.description
        : patch.description.trim(),
  });
}

export function clearArchitecture(
  architecture: Architecture,
  at: IsoTimestamp,
): Architecture {
  return bump(architecture, at, {
    requirements: [],
    constraints: [],
    components: [],
    connections: [],
    decisions: [],
  });
}

export function addRequirement(
  architecture: Architecture,
  input: AddRequirementInput,
  at: IsoTimestamp,
): Architecture {
  assertNewId(architecture, input.id);
  requireText(input.statement, "statement", "INVALID_REQUIREMENT");
  const requirement: Requirement = {
    ...input,
    statement: input.statement.trim(),
    target: input.target?.trim() || null,
    createdAt: at,
    updatedAt: at,
  };
  return bump(architecture, at, {
    requirements: [...architecture.requirements, requirement],
  });
}

export function updateRequirement(
  architecture: Architecture,
  id: EntityId,
  patch: UpdateRequirementPatch,
  at: IsoTimestamp,
): Architecture {
  const index = findIndex(architecture.requirements, id, "Requirement");
  const current = architecture.requirements[index];
  const statement =
    patch.statement === undefined ? current.statement : patch.statement.trim();
  requireText(statement, "statement", "INVALID_REQUIREMENT");
  const requirement: Requirement = {
    ...current,
    ...patch,
    statement,
    target:
      patch.target === undefined ? current.target : patch.target?.trim() || null,
    updatedAt: at,
  };
  return bump(architecture, at, {
    requirements: replaceAt(architecture.requirements, index, requirement),
  });
}

export function removeRequirement(
  architecture: Architecture,
  id: EntityId,
  at: IsoTimestamp,
): Architecture {
  findIndex(architecture.requirements, id, "Requirement");
  return bump(architecture, at, {
    requirements: architecture.requirements.filter((item) => item.id !== id),
    decisions: architecture.decisions.map((decision) => ({
      ...decision,
      evidenceRequirementIds: decision.evidenceRequirementIds.filter(
        (requirementId) => requirementId !== id,
      ),
    })),
  });
}

export function addConstraint(
  architecture: Architecture,
  input: AddConstraintInput,
  at: IsoTimestamp,
): Architecture {
  assertNewId(architecture, input.id);
  requireText(input.statement, "statement", "INVALID_CONSTRAINT");
  const constraint: Constraint = {
    ...input,
    statement: input.statement.trim(),
    source: input.source.trim(),
    createdAt: at,
    updatedAt: at,
  };
  return bump(architecture, at, {
    constraints: [...architecture.constraints, constraint],
  });
}

export function updateConstraint(
  architecture: Architecture,
  id: EntityId,
  patch: UpdateConstraintPatch,
  at: IsoTimestamp,
): Architecture {
  const index = findIndex(architecture.constraints, id, "Constraint");
  const current = architecture.constraints[index];
  const statement =
    patch.statement === undefined ? current.statement : patch.statement.trim();
  requireText(statement, "statement", "INVALID_CONSTRAINT");
  const constraint: Constraint = {
    ...current,
    ...patch,
    statement,
    source: patch.source === undefined ? current.source : patch.source.trim(),
    updatedAt: at,
  };
  return bump(architecture, at, {
    constraints: replaceAt(architecture.constraints, index, constraint),
  });
}

export function removeConstraint(
  architecture: Architecture,
  id: EntityId,
  at: IsoTimestamp,
): Architecture {
  findIndex(architecture.constraints, id, "Constraint");
  return bump(architecture, at, {
    constraints: architecture.constraints.filter((item) => item.id !== id),
  });
}

export function addComponent(
  architecture: Architecture,
  input: AddComponentInput,
  at: IsoTimestamp,
): Architecture {
  assertNewId(architecture, input.id);
  requireText(input.capabilityId, "capabilityId", "INVALID_COMPONENT");
  requireText(input.name, "name", "INVALID_COMPONENT");
  if (input.cloudServiceId && !input.providerId) {
    throw new DomainError(
      "INVALID_RESOLUTION",
      "A cloud service requires an explicit provider.",
      { componentId: input.id },
    );
  }
  const component: Component = {
    ...input,
    capabilityId: input.capabilityId.trim(),
    name: input.name.trim(),
    description: input.description.trim(),
    technologyId: input.technologyId ?? null,
    providerId: input.providerId ?? null,
    cloudServiceId: input.cloudServiceId ?? null,
    createdAt: at,
    updatedAt: at,
  };
  return bump(architecture, at, {
    components: [...architecture.components, component],
  });
}

export function updateComponent(
  architecture: Architecture,
  id: EntityId,
  patch: UpdateComponentPatch,
  at: IsoTimestamp,
): Architecture {
  const index = findIndex(architecture.components, id, "Component");
  const current = architecture.components[index];
  const name = patch.name === undefined ? current.name : patch.name.trim();
  const capabilityId =
    patch.capabilityId === undefined
      ? current.capabilityId
      : patch.capabilityId.trim();
  requireText(name, "name", "INVALID_COMPONENT");
  requireText(capabilityId, "capabilityId", "INVALID_COMPONENT");
  const component: Component = {
    ...current,
    ...patch,
    name,
    capabilityId,
    description:
      patch.description === undefined
        ? current.description
        : patch.description.trim(),
    updatedAt: at,
  };
  return bump(architecture, at, {
    components: replaceAt(architecture.components, index, component),
  });
}

export function removeComponent(
  architecture: Architecture,
  id: EntityId,
  at: IsoTimestamp,
): Architecture {
  findIndex(architecture.components, id, "Component");
  return bump(architecture, at, {
    components: architecture.components.filter((item) => item.id !== id),
    connections: architecture.connections.filter(
      (connection) =>
        connection.sourceComponentId !== id &&
        connection.targetComponentId !== id,
    ),
    decisions: architecture.decisions.filter(
      (decision) => decision.subjectId !== id,
    ),
  });
}

export function connectComponents(
  architecture: Architecture,
  input: ConnectComponentsInput,
  at: IsoTimestamp,
): Architecture {
  assertNewId(architecture, input.id);
  validateConnection(
    architecture,
    input.sourceComponentId,
    input.targetComponentId,
  );
  const connection: Connection = {
    ...input,
    label: input.label.trim(),
    createdAt: at,
    updatedAt: at,
  };
  return bump(architecture, at, {
    connections: [...architecture.connections, connection],
  });
}

export function updateConnection(
  architecture: Architecture,
  id: EntityId,
  patch: UpdateConnectionPatch,
  at: IsoTimestamp,
): Architecture {
  const index = findIndex(architecture.connections, id, "Connection");
  const current = architecture.connections[index];
  const sourceComponentId =
    patch.sourceComponentId ?? current.sourceComponentId;
  const targetComponentId =
    patch.targetComponentId ?? current.targetComponentId;
  validateConnection(architecture, sourceComponentId, targetComponentId);
  const connection: Connection = {
    ...current,
    ...patch,
    sourceComponentId,
    targetComponentId,
    label: patch.label === undefined ? current.label : patch.label.trim(),
    updatedAt: at,
  };
  return bump(architecture, at, {
    connections: replaceAt(architecture.connections, index, connection),
  });
}

export function removeConnection(
  architecture: Architecture,
  id: EntityId,
  at: IsoTimestamp,
): Architecture {
  findIndex(architecture.connections, id, "Connection");
  return bump(architecture, at, {
    connections: architecture.connections.filter((item) => item.id !== id),
  });
}

function updateResolution(
  architecture: Architecture,
  componentId: EntityId,
  at: IsoTimestamp,
  resolve: (component: Component) => Component,
): Architecture {
  const index = findIndex(architecture.components, componentId, "Component");
  const component = resolve(architecture.components[index]);
  return bump(architecture, at, {
    components: replaceAt(architecture.components, index, {
      ...component,
      updatedAt: at,
    }),
  });
}

export function setTechnology(
  architecture: Architecture,
  componentId: EntityId,
  technologyId: EntityId | null,
  at: IsoTimestamp,
): Architecture {
  return updateResolution(architecture, componentId, at, (component) => ({
    ...component,
    technologyId,
  }));
}

export function setProvider(
  architecture: Architecture,
  componentId: EntityId,
  providerId: EntityId | null,
  at: IsoTimestamp,
): Architecture {
  return updateResolution(architecture, componentId, at, (component) => ({
    ...component,
    providerId,
    cloudServiceId:
      providerId === component.providerId ? component.cloudServiceId : null,
  }));
}

export function setCloudService(
  architecture: Architecture,
  componentId: EntityId,
  cloudServiceId: EntityId | null,
  at: IsoTimestamp,
): Architecture {
  return updateResolution(architecture, componentId, at, (component) => {
    if (cloudServiceId !== null && component.providerId === null) {
      throw new DomainError(
        "INVALID_RESOLUTION",
        "A cloud service requires an explicit provider.",
        { componentId, cloudServiceId },
      );
    }
    return { ...component, cloudServiceId };
  });
}
