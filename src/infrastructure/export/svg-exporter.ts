import { ExportResultSchema, type ExportResult } from "@/application/contracts";

import {
  EXPORT_NODE_HEIGHT,
  EXPORT_NODE_WIDTH,
  type ArchitectureExportSnapshot,
} from "./export-snapshot";
import {
  createExportFilename,
  escapeXml,
  formatSvgNumber,
  truncate,
  utf8Size,
} from "./export-utils";

const TITLE_ID = "archforge-export-title";
const DESCRIPTION_ID = "archforge-export-description";

function renderConnection(
  snapshot: ArchitectureExportSnapshot,
  connection: ArchitectureExportSnapshot["architecture"]["connections"][number],
): string | null {
  const nodes = new Map(
    snapshot.architecture.components.map((component) => [component.id, component]),
  );
  const source = nodes.get(connection.sourceComponentId);
  const target = nodes.get(connection.targetComponentId);
  if (!source || !target) return null;

  const sourceX = source.position.x - snapshot.bounds.x + EXPORT_NODE_WIDTH / 2;
  const sourceY = source.position.y - snapshot.bounds.y + EXPORT_NODE_HEIGHT / 2;
  const targetX = target.position.x - snapshot.bounds.x + EXPORT_NODE_WIDTH / 2;
  const targetY = target.position.y - snapshot.bounds.y + EXPORT_NODE_HEIGHT / 2;
  const label = connection.label || connection.relationship;
  const labelX = (sourceX + targetX) / 2;
  const labelY = (sourceY + targetY) / 2 - 8;

  return [
    `<g data-connection-id="${escapeXml(connection.id)}">`,
    `<path class="connection" d="M ${formatSvgNumber(sourceX)} ${formatSvgNumber(sourceY)} L ${formatSvgNumber(targetX)} ${formatSvgNumber(targetY)}" marker-end="url(#archforge-arrow)"/>`,
    `<text class="connection-label" x="${formatSvgNumber(labelX)}" y="${formatSvgNumber(labelY)}" text-anchor="middle">${escapeXml(truncate(label, 48))}</text>`,
    "</g>",
  ].join("");
}

function renderNode(
  snapshot: ArchitectureExportSnapshot,
  component: ArchitectureExportSnapshot["architecture"]["components"][number],
): string {
  const x = component.position.x - snapshot.bounds.x;
  const y = component.position.y - snapshot.bounds.y;
  const resolutionTrail = [
    component.technologyId,
    component.providerId,
    component.cloudServiceId,
  ].filter((id): id is string => id !== null);
  const resolution =
    resolutionTrail.length > 0 ? resolutionTrail.join(" → ") : "Unresolved";
  const existing = component.existingInfrastructure
    ? '<text class="existing" x="204" y="23" text-anchor="end">EXISTING</text>'
    : "";

  return [
    `<g class="node${component.existingInfrastructure ? " node-existing" : ""}" data-component-id="${escapeXml(component.id)}" transform="translate(${formatSvgNumber(x)} ${formatSvgNumber(y)})">`,
    `<rect width="${EXPORT_NODE_WIDTH}" height="${EXPORT_NODE_HEIGHT}" rx="8"/>`,
    '<rect class="semantic-marker" x="14" y="16" width="8" height="8" rx="2"/>',
    `<text class="node-name" x="30" y="24">${escapeXml(truncate(component.name, 28))}</text>`,
    existing,
    `<text class="node-meta" x="14" y="48">${escapeXml(truncate(component.capabilityId, 34))}</text>`,
    `<text class="node-description" x="14" y="70">${escapeXml(truncate(component.description, 42))}</text>`,
    `<text class="node-resolution" x="14" y="94">${escapeXml(truncate(resolution, 34))}</text>`,
    "</g>",
  ].join("");
}

export function renderSvg(snapshot: ArchitectureExportSnapshot): string {
  const { architecture, bounds, projection } = snapshot;
  const width = formatSvgNumber(bounds.width);
  const height = formatSvgNumber(bounds.height);
  const title = `${architecture.name} architecture`;
  const description = architecture.description
    ? `${architecture.description} ${architecture.components.length} components and ${architecture.connections.length} connections.`
    : `${architecture.components.length} components and ${architecture.connections.length} connections.`;
  const background =
    projection.background === "light"
      ? `<rect class="background" width="${width}" height="${height}"/>`
      : "";
  const connections = architecture.connections
    .toSorted((left, right) => left.id.localeCompare(right.id))
    .map((connection) => renderConnection(snapshot, connection))
    .filter((value): value is string => value !== null)
    .join("");
  const nodes = architecture.components
    .toSorted((left, right) => left.id.localeCompare(right.id))
    .map((component) => renderNode(snapshot, component))
    .join("");
  const emptyState =
    architecture.components.length === 0
      ? `<text class="empty" x="${formatSvgNumber(bounds.width / 2)}" y="${formatSvgNumber(bounds.height / 2)}" text-anchor="middle">No architecture components</text>`
      : "";
  const metadata = escapeXml(JSON.stringify(architecture));

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="${TITLE_ID} ${DESCRIPTION_ID}" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">`,
    `<title id="${TITLE_ID}">${escapeXml(title)}</title>`,
    `<desc id="${DESCRIPTION_ID}">${escapeXml(description)}</desc>`,
    `<metadata data-archforge-schema-version="${architecture.schemaVersion}">${metadata}</metadata>`,
    "<defs>",
    '<marker id="archforge-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z"/></marker>',
    "<style>",
    ".background{fill:#f8fafc}.connection{fill:none;stroke:#64748b;stroke-width:1.5}.connection-label{fill:#475569;font:11px ui-monospace,SFMono-Regular,Consolas,monospace}.node rect:first-child{fill:#fff;stroke:#94a3b8;stroke-width:1}.node-existing rect:first-child{stroke:#0f766e;stroke-dasharray:5 3}.semantic-marker{fill:#2563eb;stroke:none}.node-name{fill:#0f172a;font:600 14px system-ui,sans-serif}.node-meta,.node-resolution{fill:#475569;font:11px ui-monospace,SFMono-Regular,Consolas,monospace}.node-description{fill:#334155;font:12px system-ui,sans-serif}.existing{fill:#0f766e;font:700 8px system-ui,sans-serif;letter-spacing:.06em}.empty{fill:#64748b;font:14px system-ui,sans-serif}#archforge-arrow path{fill:#64748b}",
    "</style>",
    "</defs>",
    background,
    connections,
    nodes,
    emptyState,
    "</svg>",
  ].join("");
}

export function exportSvgSnapshot(
  snapshot: ArchitectureExportSnapshot,
): ExportResult {
  const data = renderSvg(snapshot);
  return ExportResultSchema.parse({
    format: "svg",
    filename: createExportFilename(
      snapshot.architecture.name,
      snapshot.architecture.revision,
      "svg",
    ),
    mediaType: "image/svg+xml",
    encoding: "utf-8",
    data,
    size: utf8Size(data),
    warnings: snapshot.warnings,
  });
}
