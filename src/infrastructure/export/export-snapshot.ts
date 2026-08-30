import {
  ExportProjectionSettingsSchema,
  ValidationIssueSchema,
  toArchitectureContract,
  type ArchitectureContract,
  type ExportProjectionSettings,
} from "@/application/contracts";
import {
  ExportError,
  type ArchitectureExportRequest,
} from "@/application/ports";

export const EXPORT_NODE_WIDTH = 224;
export const EXPORT_NODE_HEIGHT = 112;
export const DEFAULT_EXPORT_PADDING = 48;
export const DEFAULT_EXPORT_SCALE = 1;
export const DEFAULT_EXPORT_WIDTH = 800;
export const DEFAULT_EXPORT_HEIGHT = 450;
export const MAX_RASTER_DIMENSION = 16_384;

export interface ExportBounds {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface ResolvedExportProjectionSettings {
  readonly padding: number;
  readonly scale: number;
  readonly background: "light" | "transparent";
  readonly viewport?: ExportBounds;
}

export interface ArchitectureExportSnapshot {
  readonly architecture: ArchitectureContract;
  readonly projection: ResolvedExportProjectionSettings;
  readonly bounds: ExportBounds;
  readonly warnings: readonly string[];
}

function resolveProjection(
  input: ExportProjectionSettings | undefined,
): ResolvedExportProjectionSettings {
  const projection = ExportProjectionSettingsSchema.parse(input ?? {});
  return {
    padding: projection.padding ?? DEFAULT_EXPORT_PADDING,
    scale: projection.scale ?? DEFAULT_EXPORT_SCALE,
    background: projection.background ?? "light",
    ...(projection.viewport ? { viewport: projection.viewport } : {}),
  };
}

function calculateBounds(
  architecture: ArchitectureContract,
  projection: ResolvedExportProjectionSettings,
): ExportBounds {
  if (projection.viewport) return projection.viewport;
  if (architecture.components.length === 0) {
    return {
      x: 0,
      y: 0,
      width: DEFAULT_EXPORT_WIDTH,
      height: DEFAULT_EXPORT_HEIGHT,
    };
  }

  const minX = Math.min(...architecture.components.map(({ position }) => position.x));
  const minY = Math.min(...architecture.components.map(({ position }) => position.y));
  const maxX = Math.max(
    ...architecture.components.map(({ position }) => position.x + EXPORT_NODE_WIDTH),
  );
  const maxY = Math.max(
    ...architecture.components.map(({ position }) => position.y + EXPORT_NODE_HEIGHT),
  );

  return {
    x: minX - projection.padding,
    y: minY - projection.padding,
    width: maxX - minX + projection.padding * 2,
    height: maxY - minY + projection.padding * 2,
  };
}

function formatWarnings(
  input: ArchitectureExportRequest["validationIssues"],
): readonly string[] {
  const issues = ValidationIssueSchema.array().parse(input ?? []);
  return issues
    .filter(({ severity }) => severity !== "info")
    .toSorted((left, right) => left.id.localeCompare(right.id))
    .map(
      ({ severity, message, suggestedAction }) =>
        `${severity.toUpperCase()}: ${message} ${suggestedAction}`,
    );
}

export function createArchitectureExportSnapshot(
  request: ArchitectureExportRequest,
): ArchitectureExportSnapshot {
  try {
    const architecture = toArchitectureContract(request.architecture);
    const projection = resolveProjection(request.projection);
    return {
      architecture,
      projection,
      bounds: calculateBounds(architecture, projection),
      warnings: formatWarnings(request.validationIssues),
    };
  } catch (error) {
    if (error instanceof ExportError) throw error;
    throw new ExportError(
      "The architecture snapshot could not be prepared for export.",
      "invalid-snapshot",
      false,
      error,
    );
  }
}
