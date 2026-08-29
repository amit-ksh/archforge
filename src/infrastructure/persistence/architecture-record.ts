import {
  parseArchitectureContract,
  toArchitectureContract,
  type ArchitectureContract,
} from "@/application/contracts";
import { ArchitectureRepositoryError } from "@/application/ports";
import type { Architecture } from "@/domain/architecture";

export function serializeArchitecture(
  architecture: Architecture,
): ArchitectureContract {
  try {
    return toArchitectureContract(architecture);
  } catch (error) {
    throw new ArchitectureRepositoryError(
      "corrupt-data",
      "Architecture data could not be serialized for persistence.",
      false,
      error,
    );
  }
}

export function hydrateArchitecture(input: unknown): Architecture {
  try {
    return parseArchitectureContract(input);
  } catch (error) {
    throw new ArchitectureRepositoryError(
      "corrupt-data",
      "Stored architecture data failed runtime validation.",
      false,
      error,
    );
  }
}
