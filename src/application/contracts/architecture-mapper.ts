import type { Architecture } from "@/domain/architecture";

import {
  ArchitectureSchema,
  CONTRACT_VERSION,
  type ArchitectureContract,
} from "./schemas";

export function toArchitectureContract(
  architecture: Architecture,
): ArchitectureContract {
  return ArchitectureSchema.parse({
    schemaVersion: CONTRACT_VERSION,
    ...architecture,
  });
}

export function parseArchitectureContract(input: unknown): Architecture {
  const contract = ArchitectureSchema.parse(input);
  return {
    id: contract.id,
    name: contract.name,
    description: contract.description,
    requirements: contract.requirements,
    constraints: contract.constraints,
    components: contract.components,
    connections: contract.connections,
    decisions: contract.decisions,
    revision: contract.revision,
    createdAt: contract.createdAt,
    updatedAt: contract.updatedAt,
  };
}

export function safeParseArchitectureContract(input: unknown) {
  return ArchitectureSchema.safeParse(input);
}
