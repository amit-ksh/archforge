import { z } from "zod";

import {
  EntityIdSchema,
  ExportProjectionSettingsSchema,
  createToolInputSchema,
} from "@/application/contracts";

const ExportTargetSchema = z.strictObject({
  architectureId: EntityIdSchema,
});

export const ExportJsonToolInputSchema = createToolInputSchema(
  ExportTargetSchema,
);

export const ExportSvgToolInputSchema = createToolInputSchema(
  ExportTargetSchema.extend({
    projection: ExportProjectionSettingsSchema.omit({ scale: true }).optional(),
  }),
);

export const ExportPngToolInputSchema = createToolInputSchema(
  ExportTargetSchema.extend({
    projection: ExportProjectionSettingsSchema.optional(),
  }),
);
