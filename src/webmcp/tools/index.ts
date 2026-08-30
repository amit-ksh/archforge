import type { WebMcpToolDefinition } from "@/webmcp/core";

import {
  createAnalysisTools,
  type AnalysisToolDependencies,
} from "./analysis";
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
import { createExportTools, type ExportToolDependencies } from "./export";
import {
  createRequirementTools,
  type RequirementToolDependencies,
} from "./requirements";
import {
  createResolutionTools,
  type ResolutionToolDependencies,
} from "./resolution";

export * from "./analysis";
export * from "./architecture";
export * from "./components";
export * from "./connections";
export * from "./export";
export * from "./requirements";
export * from "./resolution";

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

export function createResolutionToolSet(
  dependencies: ResolutionToolDependencies,
): readonly WebMcpToolDefinition[] {
  return createResolutionTools(dependencies);
}

export type AnalysisExportToolDependencies =
  AnalysisToolDependencies & ExportToolDependencies;

export function createAnalysisExportTools(
  dependencies: AnalysisExportToolDependencies,
): readonly WebMcpToolDefinition[] {
  return [
    ...createAnalysisTools(dependencies),
    ...createExportTools(dependencies),
  ];
}
