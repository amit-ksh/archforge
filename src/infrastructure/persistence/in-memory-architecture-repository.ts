import type { ArchitectureContract } from "@/application/contracts";
import type { ArchitectureRepository } from "@/application/ports";
import type { Architecture, EntityId } from "@/domain/architecture";

import { hydrateArchitecture, serializeArchitecture } from "./architecture-record";

function compareArchitectures(left: Architecture, right: Architecture) {
  if (left.updatedAt !== right.updatedAt) {
    return left.updatedAt > right.updatedAt ? -1 : 1;
  }
  if (left.id === right.id) return 0;
  return left.id < right.id ? -1 : 1;
}

export class InMemoryArchitectureRepository implements ArchitectureRepository {
  private readonly records = new Map<EntityId, ArchitectureContract>();

  async list(): Promise<readonly Architecture[]> {
    return [...this.records.values()]
      .map((record) => hydrateArchitecture(record))
      .sort(compareArchitectures);
  }

  async get(id: EntityId): Promise<Architecture | null> {
    const record = this.records.get(id);
    return record ? hydrateArchitecture(record) : null;
  }

  async save(architecture: Architecture): Promise<void> {
    this.records.set(architecture.id, serializeArchitecture(architecture));
  }

  async delete(id: EntityId): Promise<void> {
    this.records.delete(id);
  }
}
