import { ExportResultSchema, type ExportFormat } from "@/application/contracts";
import type { ArchitectureExporter } from "@/application/ports";
import type {
  ArchitectureService,
  ValidationService,
} from "@/application/services";
import { DomainError } from "@/domain/architecture";
import { defineWebMcpTool } from "@/webmcp/core";

import {
  ExportJsonToolInputSchema,
  ExportPngToolInputSchema,
  ExportSvgToolInputSchema,
} from "./schemas";

export interface ExportToolDependencies {
  readonly architectureService: ArchitectureService;
  readonly validationService: ValidationService;
  readonly exporter: ArchitectureExporter;
}

export function createExportTools(dependencies: ExportToolDependencies) {
  const { architectureService, validationService, exporter } = dependencies;

  async function exportArchitecture(
    architectureId: string,
    format: ExportFormat,
    projection?: Parameters<ArchitectureExporter["export"]>[1]["projection"],
  ) {
    const architecture = await architectureService.get(architectureId);
    if (!architecture) {
      throw new DomainError(
        "ENTITY_NOT_FOUND",
        `Architecture '${architectureId}' was not found.`,
      );
    }
    const validationIssues = await validationService.validate(architectureId);
    return exporter.export(format, {
      architecture,
      validationIssues,
      ...(projection ? { projection } : {}),
    });
  }

  return [
    defineWebMcpTool({
      name: "export_json",
      title: "Export JSON",
      description:
        "Export a lossless versioned architecture snapshot as local JSON.",
      behavior: "read",
      inputSchema: ExportJsonToolInputSchema,
      outputSchema: ExportResultSchema,
      async handler({ payload }) {
        const result = await exportArchitecture(payload.architectureId, "json");
        return {
          value: result,
          summary: `Exported '${result.filename}' as JSON.`,
        };
      },
    }),
    defineWebMcpTool({
      name: "export_svg",
      title: "Export SVG",
      description:
        "Export an accessible deterministic architecture projection as local SVG.",
      behavior: "read",
      inputSchema: ExportSvgToolInputSchema,
      outputSchema: ExportResultSchema,
      async handler({ payload }) {
        const result = await exportArchitecture(
          payload.architectureId,
          "svg",
          payload.projection,
        );
        return {
          value: result,
          summary: `Exported '${result.filename}' as SVG.`,
        };
      },
    }),
    defineWebMcpTool({
      name: "export_png",
      title: "Export PNG",
      description:
        "Rasterize an architecture projection locally as a bounded PNG download.",
      behavior: "read",
      inputSchema: ExportPngToolInputSchema,
      outputSchema: ExportResultSchema,
      async handler({ payload }) {
        const result = await exportArchitecture(
          payload.architectureId,
          "png",
          payload.projection,
        );
        return {
          value: result,
          summary: `Exported '${result.filename}' as PNG.`,
        };
      },
    }),
  ] as const;
}
