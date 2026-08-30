import type {
  ExportFormat,
  ExportProjectionSettings,
  ExportResult,
  ValidationIssue,
} from "@/application/contracts";
import type { Architecture } from "@/domain/architecture";

export interface ArchitectureExportRequest {
  readonly architecture: Architecture;
  readonly projection?: ExportProjectionSettings;
  readonly validationIssues?: readonly ValidationIssue[];
}

export interface ArchitectureExporter {
  export(
    format: ExportFormat,
    request: ArchitectureExportRequest,
  ): Promise<ExportResult>;
  exportAll(request: ArchitectureExportRequest): Promise<readonly ExportResult[]>;
  release(result: ExportResult): void;
  dispose(): void;
}

export type ExportFailureReason =
  | "invalid-snapshot"
  | "unsupported-browser"
  | "canvas"
  | "blob"
  | "download";

export class ExportError extends Error {
  readonly code = "EXPORT_ERROR" as const;

  constructor(
    message: string,
    readonly reason: ExportFailureReason,
    readonly retryable: boolean,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "ExportError";
  }
}
