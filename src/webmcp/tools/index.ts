import type { WebMcpToolDefinition } from "@/webmcp/core";

import {
  createArchitectureTools,
  type ArchitectureToolDependencies,
} from "./architecture";
import {
  createRequirementTools,
  type RequirementToolDependencies,
} from "./requirements";

export * from "./architecture";
export * from "./requirements";

export type ArchitectureRequirementToolDependencies =
  ArchitectureToolDependencies & RequirementToolDependencies;

export function createArchitectureRequirementTools(
  dependencies: ArchitectureRequirementToolDependencies,
): readonly WebMcpToolDefinition[] {
  return [
    ...createArchitectureTools(dependencies),
    ...createRequirementTools(dependencies),
  ];
}
