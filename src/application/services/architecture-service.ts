import type {
  ArchitectureRepository,
  Clock,
  IdGenerator,
} from "@/application/ports";
import {
  createArchitecture,
  type Architecture,
  type EntityId,
} from "@/domain/architecture";

export interface CreateArchitectureRequest {
  readonly id?: EntityId;
  readonly name: string;
  readonly description?: string;
}

export class ArchitectureService {
  constructor(
    private readonly repository: ArchitectureRepository,
    private readonly clock: Clock,
    private readonly idGenerator: IdGenerator,
  ) {}

  async create(request: CreateArchitectureRequest): Promise<Architecture> {
    const architecture = createArchitecture(
      {
        id: request.id ?? this.idGenerator.next("architecture"),
        name: request.name,
        description: request.description,
      },
      this.clock.now(),
    );
    await this.repository.save(architecture);
    return architecture;
  }

  list(): Promise<readonly Architecture[]> {
    return this.repository.list();
  }

  get(id: EntityId): Promise<Architecture | null> {
    return this.repository.get(id);
  }

  async save(architecture: Architecture): Promise<Architecture> {
    await this.repository.save(architecture);
    return architecture;
  }

  async delete(id: EntityId): Promise<void> {
    await this.repository.delete(id);
  }
}
