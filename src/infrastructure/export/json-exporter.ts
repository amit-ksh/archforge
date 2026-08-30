import { ExportResultSchema, type ExportResult } from "@/application/contracts";

import type { ArchitectureExportSnapshot } from "./export-snapshot";
import { createExportFilename, utf8Size } from "./export-utils";

export function exportJsonSnapshot(
  snapshot: ArchitectureExportSnapshot,
): ExportResult {
  const data = `${JSON.stringify(snapshot.architecture, null, 2)}\n`;
  return ExportResultSchema.parse({
    format: "json",
    filename: createExportFilename(
      snapshot.architecture.name,
      snapshot.architecture.revision,
      "json",
    ),
    mediaType: "application/json",
    encoding: "utf-8",
    data,
    size: utf8Size(data),
    warnings: snapshot.warnings,
  });
}
