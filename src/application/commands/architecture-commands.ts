import type {
  AddComponentInput,
  AddConstraintInput,
  AddRequirementInput,
  ConnectComponentsInput,
  CreateArchitectureInput,
  EntityId,
  UpdateArchitecturePatch,
  UpdateComponentPatch,
  UpdateConnectionPatch,
  UpdateConstraintPatch,
  UpdateRequirementPatch,
} from "@/domain/architecture";

interface ArchitectureCommandBase {
  readonly architectureId: EntityId;
}

export interface CreateArchitectureCommand {
  readonly type: "architecture.create";
  readonly input: CreateArchitectureInput;
}

export interface UpdateArchitectureCommand extends ArchitectureCommandBase {
  readonly type: "architecture.update";
  readonly patch: UpdateArchitecturePatch;
}

export interface ClearArchitectureCommand extends ArchitectureCommandBase {
  readonly type: "architecture.clear";
}

export interface AddRequirementCommand extends ArchitectureCommandBase {
  readonly type: "requirement.add";
  readonly requirement: AddRequirementInput;
}

export interface UpdateRequirementCommand extends ArchitectureCommandBase {
  readonly type: "requirement.update";
  readonly requirementId: EntityId;
  readonly patch: UpdateRequirementPatch;
}

export interface RemoveRequirementCommand extends ArchitectureCommandBase {
  readonly type: "requirement.remove";
  readonly requirementId: EntityId;
}

export interface AddConstraintCommand extends ArchitectureCommandBase {
  readonly type: "constraint.add";
  readonly constraint: AddConstraintInput;
}

export interface UpdateConstraintCommand extends ArchitectureCommandBase {
  readonly type: "constraint.update";
  readonly constraintId: EntityId;
  readonly patch: UpdateConstraintPatch;
}

export interface RemoveConstraintCommand extends ArchitectureCommandBase {
  readonly type: "constraint.remove";
  readonly constraintId: EntityId;
}

export interface AddComponentCommand extends ArchitectureCommandBase {
  readonly type: "component.add";
  readonly component: AddComponentInput;
}

export interface UpdateComponentCommand extends ArchitectureCommandBase {
  readonly type: "component.update";
  readonly componentId: EntityId;
  readonly patch: UpdateComponentPatch;
}

export interface RemoveComponentCommand extends ArchitectureCommandBase {
  readonly type: "component.remove";
  readonly componentId: EntityId;
}

export interface ConnectComponentsCommand extends ArchitectureCommandBase {
  readonly type: "connection.connect";
  readonly connection: ConnectComponentsInput;
}

export interface UpdateConnectionCommand extends ArchitectureCommandBase {
  readonly type: "connection.update";
  readonly connectionId: EntityId;
  readonly patch: UpdateConnectionPatch;
}

export interface RemoveConnectionCommand extends ArchitectureCommandBase {
  readonly type: "connection.remove";
  readonly connectionId: EntityId;
}

export interface SetTechnologyCommand extends ArchitectureCommandBase {
  readonly type: "resolution.set-technology";
  readonly componentId: EntityId;
  readonly technologyId: EntityId | null;
}

export interface SetProviderCommand extends ArchitectureCommandBase {
  readonly type: "resolution.set-provider";
  readonly componentId: EntityId;
  readonly providerId: EntityId | null;
}

export interface SetCloudServiceCommand extends ArchitectureCommandBase {
  readonly type: "resolution.set-cloud-service";
  readonly componentId: EntityId;
  readonly cloudServiceId: EntityId | null;
}

export type ArchitectureCommand =
  | CreateArchitectureCommand
  | UpdateArchitectureCommand
  | ClearArchitectureCommand
  | AddRequirementCommand
  | UpdateRequirementCommand
  | RemoveRequirementCommand
  | AddConstraintCommand
  | UpdateConstraintCommand
  | RemoveConstraintCommand
  | AddComponentCommand
  | UpdateComponentCommand
  | RemoveComponentCommand
  | ConnectComponentsCommand
  | UpdateConnectionCommand
  | RemoveConnectionCommand
  | SetTechnologyCommand
  | SetProviderCommand
  | SetCloudServiceCommand;
