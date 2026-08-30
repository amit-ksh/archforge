import { ExportResultSchema, type ExportResult } from "@/application/contracts";
import { ExportError } from "@/application/ports";

import {
  MAX_RASTER_DIMENSION,
  type ArchitectureExportSnapshot,
} from "./export-snapshot";
import { createExportFilename } from "./export-utils";
import { renderSvg } from "./svg-exporter";

export interface PngRasterizer {
  rasterize(
    svg: string,
    width: number,
    height: number,
  ): Promise<Blob>;
}

export interface DownloadUrlAdapter {
  create(blob: Blob): string;
  revoke(url: string): void;
}

function requireBrowserApi<T>(value: T | undefined, api: string): T {
  if (value === undefined) {
    throw new ExportError(
      `PNG export requires the browser ${api} API.`,
      "unsupported-browser",
      false,
    );
  }
  return value;
}

export class BrowserCanvasPngRasterizer implements PngRasterizer {
  async rasterize(svg: string, width: number, height: number): Promise<Blob> {
    const browserDocument = requireBrowserApi(globalThis.document, "document");
    const BrowserImage = requireBrowserApi(globalThis.Image, "Image");
    const BrowserBlob = requireBrowserApi(globalThis.Blob, "Blob");
    const browserUrl = requireBrowserApi(globalThis.URL, "URL");
    if (!browserUrl.createObjectURL || !browserUrl.revokeObjectURL) {
      throw new ExportError(
        "PNG export requires browser object URL support.",
        "unsupported-browser",
        false,
      );
    }

    const svgBlob = new BrowserBlob([svg], {
      type: "image/svg+xml;charset=utf-8",
    });
    let sourceUrl: string;
    try {
      sourceUrl = browserUrl.createObjectURL(svgBlob);
    } catch (error) {
      throw new ExportError(
        "The SVG projection could not be prepared for PNG rasterization.",
        "blob",
        true,
        error,
      );
    }

    try {
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const candidate = new BrowserImage();
        candidate.onload = () => resolve(candidate);
        candidate.onerror = () =>
          reject(
            new ExportError(
              "The browser could not decode the SVG projection.",
              "canvas",
              true,
            ),
          );
        candidate.src = sourceUrl;
      });
      const canvas = browserDocument.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) {
        throw new ExportError(
          "The browser could not create a 2D canvas for PNG export.",
          "canvas",
          true,
        );
      }
      context.drawImage(image, 0, 0, width, height);
      return await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else {
            reject(
              new ExportError(
                "The browser could not encode the architecture as PNG.",
                "blob",
                true,
              ),
            );
          }
        }, "image/png");
      });
    } catch (error) {
      if (error instanceof ExportError) throw error;
      throw new ExportError(
        "The architecture could not be rasterized as PNG.",
        "canvas",
        true,
        error,
      );
    } finally {
      browserUrl.revokeObjectURL(sourceUrl);
    }
  }
}

export class BrowserDownloadUrlAdapter implements DownloadUrlAdapter {
  create(blob: Blob): string {
    try {
      const browserUrl = requireBrowserApi(globalThis.URL, "URL");
      if (!browserUrl.createObjectURL) {
        throw new ExportError(
          "Local download URLs are not supported by this browser.",
          "unsupported-browser",
          false,
        );
      }
      return browserUrl.createObjectURL(blob);
    } catch (error) {
      if (error instanceof ExportError) throw error;
      throw new ExportError(
        "The PNG download URL could not be created.",
        "download",
        true,
        error,
      );
    }
  }

  revoke(url: string): void {
    globalThis.URL?.revokeObjectURL?.(url);
  }
}

export class BrowserPngSnapshotExporter {
  private readonly activeUrls = new Set<string>();

  constructor(
    private readonly rasterizer: PngRasterizer = new BrowserCanvasPngRasterizer(),
    private readonly downloadUrls: DownloadUrlAdapter = new BrowserDownloadUrlAdapter(),
  ) {}

  async export(snapshot: ArchitectureExportSnapshot): Promise<ExportResult> {
    const width = Math.ceil(snapshot.bounds.width * snapshot.projection.scale);
    const height = Math.ceil(snapshot.bounds.height * snapshot.projection.scale);
    if (
      width < 1 ||
      height < 1 ||
      width > MAX_RASTER_DIMENSION ||
      height > MAX_RASTER_DIMENSION
    ) {
      throw new ExportError(
        `PNG dimensions must be between 1 and ${MAX_RASTER_DIMENSION} pixels per side.`,
        "canvas",
        false,
      );
    }

    const blob = await this.rasterizer.rasterize(
      renderSvg(snapshot),
      width,
      height,
    );
    if (blob.type && blob.type !== "image/png") {
      throw new ExportError(
        "The browser returned an unsupported PNG blob type.",
        "blob",
        true,
      );
    }
    const data = this.downloadUrls.create(blob);
    this.activeUrls.add(data);
    try {
      return ExportResultSchema.parse({
        format: "png",
        filename: createExportFilename(
          snapshot.architecture.name,
          snapshot.architecture.revision,
          "png",
        ),
        mediaType: "image/png",
        encoding: "object-url",
        data,
        size: blob.size,
        warnings: snapshot.warnings,
      });
    } catch (error) {
      this.releaseUrl(data);
      throw new ExportError(
        "The PNG download result could not be created.",
        "download",
        false,
        error,
      );
    }
  }

  release(result: ExportResult): void {
    if (result.encoding === "object-url") this.releaseUrl(result.data);
  }

  dispose(): void {
    for (const url of [...this.activeUrls]) this.releaseUrl(url);
  }

  private releaseUrl(url: string): void {
    if (!this.activeUrls.delete(url)) return;
    this.downloadUrls.revoke(url);
  }
}
