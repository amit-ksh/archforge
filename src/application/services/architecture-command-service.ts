import type { ArchitectureCommand } from "@/application/commands";
import type { ArchitectureRepository, Clock } from "@/application/ports";
import {
  DomainError,
  addComponent,
  addConstraint,
  addRequirement,
  clearArchitecture,
  connectComponents,
  createArchitecture,
  removeComponent,
  removeConnection,
  removeConstraint,
  removeRequirement,
  setCloudService,
  setProvider,
  setTechnology,
  updateArchitecture,
  updateComponent,
  updateConnection,
  updateConstraint,
  updateRequirement,
  type Architecture,
  type EntityId,
} from "@/domain/architecture";

export class ArchitectureCommandService {
  constructor(
    private readonly repository: ArchitectureRepository,
    private readonly clock: Clock,
  ) {}

  async execute(command: ArchitectureCommand): Promise<Architecture> {
    if (command.type === "architecture.create") {
      const existing = await this.repository.get(command.input.id);
      if (existing) {
        throw new DomainError(
          "DUPLICATE_ID",
          `Architecture '${command.input.id}' already exists.`,
          { id: command.input.id },
        );
      }
      const architecture = createArchitecture(
        command.input,
        this.clock.now(),
      );
      await this.repository.save(architecture);
      return architecture;
    }

    const architecture = await this.requireArchitecture(command.architectureId);
    const at = this.clock.now();
    let updated: Architecture;

    switch (command.type) {
      case "architecture.update":
        updated = updateArchitecture(architecture, command.patch, at);
        break;
      case "architecture.clear":
        updated = clearArchitecture(architecture, at);
        break;
      case "requirement.add":
        updated = addRequirement(architecture, command.requirement, at);
        break;
      case "requirement.update":
        updated = updateRequirement(
          architecture,
          command.requirementId,
          command.patch,
          at,
        );
        break;
      case "requirement.remove":
        updated = removeRequirement(
          architecture,
          command.requirementId,
          at,
        );
        break;
      case "constraint.add":
        updated = addConstraint(architecture, command.constraint, at);
        break;
      case "constraint.update":
        updated = updateConstraint(
          architecture,
          command.constraintId,
          command.patch,
          at,
        );
        break;
      case "constraint.remove":
        updated = removeConstraint(architecture, command.constraintId, at);
        break;
      case "component.add":
        updated = addComponent(architecture, command.component, at);
        break;
      case "component.update":
        updated = updateComponent(
          architecture,
          command.componentId,
          command.patch,
          at,
        );
        break;
      case "component.remove":
        updated = removeComponent(architecture, command.componentId, at);
        break;
      case "connection.connect":
        updated = connectComponents(architecture, command.connection, at);
        break;
      case "connection.update":
        updated = updateConnection(
          architecture,
          command.connectionId,
          command.patch,
          at,
        );
        break;
      case "connection.remove":
        updated = removeConnection(architecture, command.connectionId, at);
        break;
      case "resolution.set-technology":
        updated = setTechnology(
          architecture,
          command.componentId,
          command.technologyId,
          at,
        );
        break;
      case "resolution.set-provider":
        updated = setProvider(
          architecture,
          command.componentId,
          command.providerId,
          at,
        );
        break;
      case "resolution.set-cloud-service":
        updated = setCloudService(
          architecture,
          command.componentId,
          command.cloudServiceId,
          at,
        );
        break;
    }

    await this.repository.save(updated);
    return updated;
  }

  private async requireArchitecture(id: EntityId): Promise<Architecture> {
    const architecture = await this.repository.get(id);
    if (!architecture) {
      throw new DomainError(
        "ENTITY_NOT_FOUND",
        `Architecture '${id}' was not found.`,
        { entity: "Architecture", id },
      );
    }
    return architecture;
  }
}
