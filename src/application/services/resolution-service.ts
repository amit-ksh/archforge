import type {
  SetCloudServiceCommand,
  SetProviderCommand,
  SetTechnologyCommand,
} from "@/application/commands";
import type { ArchitectureRepository, Clock } from "@/application/ports";
import {
  DomainError,
  setCloudService,
  setProvider,
  setTechnology,
  type Architecture,
  type EntityId,
} from "@/domain/architecture";
import {
  ResolutionEngine,
  type ResolutionCandidateKind,
  type ResolutionResult,
  type ResolutionSelectionResult,
} from "@/domain/resolution";

export interface ResolutionQuery {
  readonly architectureId: EntityId;
  readonly componentId: EntityId;
  readonly candidateKind: ResolutionCandidateKind;
}

export type ResolutionCommand =
  | SetTechnologyCommand
  | SetProviderCommand
  | SetCloudServiceCommand;

export class ResolutionService {
  constructor(
    private readonly repository: ArchitectureRepository,
    private readonly clock: Clock,
    private readonly engine: ResolutionEngine,
  ) {}

  async list(query: ResolutionQuery): Promise<ResolutionResult> {
    const architecture = await this.requireArchitecture(query.architectureId);
    return this.engine.list(
      architecture,
      query.componentId,
      query.candidateKind,
    );
  }

  async suggest(query: ResolutionQuery): Promise<ResolutionResult> {
    const architecture = await this.requireArchitecture(query.architectureId);
    return this.engine.suggest(
      architecture,
      query.componentId,
      query.candidateKind,
    );
  }

  async execute(command: ResolutionCommand): Promise<ResolutionSelectionResult> {
    const architecture = await this.requireArchitecture(command.architectureId);
    const selection = this.selectionFrom(command);
    if (selection.candidateId !== null) {
      const error = this.engine.assessSelection(
        architecture,
        command.componentId,
        selection.candidateKind,
        selection.candidateId,
      );
      if (error) return { ok: false, error };
    }

    const at = this.clock.now();
    let updated: Architecture;
    switch (command.type) {
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
    return { ok: true, value: updated };
  }

  private selectionFrom(command: ResolutionCommand): {
    readonly candidateKind: ResolutionCandidateKind;
    readonly candidateId: EntityId | null;
  } {
    switch (command.type) {
      case "resolution.set-technology":
        return {
          candidateKind: "technology",
          candidateId: command.technologyId,
        };
      case "resolution.set-provider":
        return {
          candidateKind: "provider",
          candidateId: command.providerId,
        };
      case "resolution.set-cloud-service":
        return {
          candidateKind: "cloud-service",
          candidateId: command.cloudServiceId,
        };
    }
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
