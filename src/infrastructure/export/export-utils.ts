import type { ExportFormat } from "@/application/contracts";

export function createExportFilename(
  architectureName: string,
  revision: number,
  format: ExportFormat,
): string {
  const slug = architectureName
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return `${slug || "architecture"}-r${revision}.${format}`;
}

export function utf8Size(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

export function escapeXml(value: string): string {
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function truncate(value: string, maximumLength: number): string {
  if (value.length <= maximumLength) return value;
  return `${value.slice(0, Math.max(0, maximumLength - 1))}…`;
}

export function formatSvgNumber(value: number): string {
  return Number(value.toFixed(2)).toString();
}
