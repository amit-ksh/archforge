import type {
  ExportFormat,
  ExportResult,
} from "@/application/contracts";
import type {
  ArchitectureExporter,
  ArchitectureExportRequest,
} from "@/application/ports";

import { BrowserPngSnapshotExporter } from "./browser-png-exporter";
import { createArchitectureExportSnapshot } from "./export-snapshot";
import { exportJsonSnapshot } from "./json-exporter";
import { exportSvgSnapshot } from "./svg-exporter";

export class ArchitectureExportEngine implements ArchitectureExporter {
  constructor(
    private readonly pngExporter: BrowserPngSnapshotExporter =
      new BrowserPngSnapshotExporter(),
  ) {}

  async export(
    format: ExportFormat,
    request: ArchitectureExportRequest,
  ): Promise<ExportResult> {
    const snapshot = createArchitectureExportSnapshot(request);
    return this.exportSnapshot(format, snapshot);
  }

  async exportAll(
    request: ArchitectureExportRequest,
  ): Promise<readonly ExportResult[]> {
    const snapshot = createArchitectureExportSnapshot(request);
    return Promise.all(
      (["json", "svg", "png"] as const).map((format) =>
        this.exportSnapshot(format, snapshot),
      ),
    );
  }

  release(result: ExportResult): void {
    this.pngExporter.release(result);
  }

  dispose(): void {
    this.pngExporter.dispose();
  }

  private async exportSnapshot(
    format: ExportFormat,
    snapshot: ReturnType<typeof createArchitectureExportSnapshot>,
  ): Promise<ExportResult> {
    switch (format) {
      case "json":
        return exportJsonSnapshot(snapshot);
      case "svg":
        return exportSvgSnapshot(snapshot);
      case "png":
        return this.pngExporter.export(snapshot);
    }
  }
}
