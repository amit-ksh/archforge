import type { WebMcpToolDefinition } from "@/webmcp/core";

import {
  createArchitectureTools,
  type ArchitectureToolDependencies,
} from "./architecture";
import {
  createComponentTools,
  type ComponentToolDependencies,
} from "./components";
import {
  createConnectionTools,
  type ConnectionToolDependencies,
} from "./connections";
import {
  createRequirementTools,
  type RequirementToolDependencies,
} from "./requirements";

export * from "./architecture";
export * from "./components";
export * from "./connections";
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

export type DesignToolDependencies =
  ComponentToolDependencies & ConnectionToolDependencies;

export function createDesignTools(
  dependencies: DesignToolDependencies,
): readonly WebMcpToolDefinition[] {
  return [
    ...createComponentTools(dependencies),
    ...createConnectionTools(dependencies),
  ];
}
