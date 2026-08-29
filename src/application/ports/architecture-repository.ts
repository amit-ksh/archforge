import type { Architecture, EntityId } from "@/domain/architecture";

export interface ArchitectureRepository {
  list(): Promise<readonly Architecture[]>;
  get(id: EntityId): Promise<Architecture | null>;
  save(architecture: Architecture): Promise<void>;
  delete(id: EntityId): Promise<void>;
}

export type RepositoryFailureKind =
  | "unavailable"
  | "quota"
  | "corrupt-data"
  | "transaction"
  | "unknown";

export class ArchitectureRepositoryError extends Error {
  readonly code = "PERSISTENCE_ERROR" as const;

  constructor(
    readonly kind: RepositoryFailureKind,
    message: string,
    readonly retryable: boolean,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "ArchitectureRepositoryError";
  }
}
