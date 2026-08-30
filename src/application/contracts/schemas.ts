import { z } from "zod";

export const CONTRACT_VERSION = 1 as const;

export const EntityIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/);
const IsoTimestampSchema = z.string().datetime({ offset: true });

export const RequirementSchema = z.strictObject({
  id: EntityIdSchema,
  statement: z.string().trim().min(1),
  category: z.enum([
    "functional",
    "performance",
    "reliability",
    "security",
    "compliance",
    "operability",
    "cost",
    "other",
  ]),
  priority: z.enum(["low", "medium", "high", "critical"]),
  target: z.string().trim().min(1).nullable(),
  createdAt: IsoTimestampSchema,
  updatedAt: IsoTimestampSchema,
});

export const ConstraintSchema = z.strictObject({
  id: EntityIdSchema,
  kind: z.enum([
    "provider",
    "residency",
    "budget",
    "skill",
    "existing-infrastructure",
    "operational",
    "other",
  ]),
  statement: z.string().trim().min(1),
  severity: z.enum(["hard", "preference"]),
  value: z
    .union([
      z.string(),
      z.number().finite(),
      z.boolean(),
      z.array(z.string()),
    ])
    .nullable(),
  source: z.string(),
  createdAt: IsoTimestampSchema,
  updatedAt: IsoTimestampSchema,
});

export const ComponentSchema = z.strictObject({
  id: EntityIdSchema,
  capabilityId: EntityIdSchema,
  name: z.string().trim().min(1),
  description: z.string(),
  position: z.strictObject({
    x: z.number().finite(),
    y: z.number().finite(),
  }),
  existingInfrastructure: z.boolean(),
  technologyId: EntityIdSchema.nullable(),
  providerId: EntityIdSchema.nullable(),
  cloudServiceId: EntityIdSchema.nullable(),
  createdAt: IsoTimestampSchema,
  updatedAt: IsoTimestampSchema,
});

export const ConnectionSchema = z.strictObject({
  id: EntityIdSchema,
  sourceComponentId: EntityIdSchema,
  targetComponentId: EntityIdSchema,
  relationship: z.enum([
    "dependency",
    "request",
    "data",
    "event",
    "control",
    "other",
  ]),
  label: z.string(),
  createdAt: IsoTimestampSchema,
  updatedAt: IsoTimestampSchema,
});

export const DecisionSchema = z.strictObject({
  id: EntityIdSchema,
  subjectId: EntityIdSchema,
  choiceId: EntityIdSchema.nullable(),
  status: z.enum(["proposed", "accepted", "rejected"]),
  rationale: z.string(),
  evidenceRequirementIds: z.array(EntityIdSchema),
  alternativeIds: z.array(EntityIdSchema),
  createdAt: IsoTimestampSchema,
  updatedAt: IsoTimestampSchema,
});

export const ArchitectureSchema = z.strictObject({
  schemaVersion: z.literal(CONTRACT_VERSION),
  id: EntityIdSchema,
  name: z.string().trim().min(1),
  description: z.string(),
  requirements: z.array(RequirementSchema),
  constraints: z.array(ConstraintSchema),
  components: z.array(ComponentSchema),
  connections: z.array(ConnectionSchema),
  decisions: z.array(DecisionSchema),
  revision: z.number().int().nonnegative(),
  createdAt: IsoTimestampSchema,
  updatedAt: IsoTimestampSchema,
});

export const FieldIssueSchema = z.strictObject({
  path: z.array(z.union([z.string(), z.number().int().nonnegative()])),
  message: z.string().min(1),
});

export const ErrorSchema = z.strictObject({
  code: z.string().regex(/^[A-Z][A-Z0-9_]*$/),
  message: z.string().min(1),
  fieldIssues: z.array(FieldIssueSchema).optional(),
  details: z.record(z.string(), z.unknown()).optional(),
  retryable: z.boolean(),
  correlationId: z.string().min(1),
});

export const MutationSummarySchema = z.strictObject({
  behavior: z.literal("mutation"),
  architectureId: EntityIdSchema,
  revision: z.number().int().nonnegative(),
  affectedIds: z.array(EntityIdSchema),
  summary: z.string().min(1),
});

export const ValidationIssueSchema = z.strictObject({
  id: EntityIdSchema,
  severity: z.enum(["info", "warning", "error"]),
  rule: z.string().min(1),
  message: z.string().min(1),
  affectedEntityIds: z.array(EntityIdSchema).min(1),
  suggestedAction: z.string().min(1),
});

export const ExportFormatSchema = z.enum(["json", "svg", "png"]);

export const ExportProjectionSettingsSchema = z.strictObject({
  padding: z.number().finite().min(0).max(256).optional(),
  scale: z.number().finite().min(0.25).max(4).optional(),
  background: z.enum(["light", "transparent"]).optional(),
  viewport: z
    .strictObject({
      x: z.number().finite(),
      y: z.number().finite(),
      width: z.number().finite().positive().max(16_384),
      height: z.number().finite().positive().max(16_384),
    })
    .optional(),
});

export const ExportResultSchema = z.strictObject({
  format: ExportFormatSchema,
  filename: z.string().min(1),
  mediaType: z.enum(["application/json", "image/svg+xml", "image/png"]),
  encoding: z.enum(["utf-8", "base64", "object-url"]),
  data: z.string(),
  size: z.number().int().nonnegative(),
  warnings: z.array(z.string().min(1)),
});

export function createToolInputSchema<TPayload extends z.ZodType>(
  payloadSchema: TPayload,
) {
  return z.strictObject({
    contractVersion: z.literal(CONTRACT_VERSION),
    requestId: z.string().min(1).optional(),
    payload: payloadSchema,
  });
}

export const ToolInputSchema = createToolInputSchema(
  z.record(z.string(), z.unknown()),
);

export function createToolResultSchema<TValue extends z.ZodType>(
  valueSchema: TValue,
) {
  return z.discriminatedUnion("ok", [
    z.strictObject({
      ok: z.literal(true),
      contractVersion: z.literal(CONTRACT_VERSION),
      value: valueSchema,
      mutation: MutationSummarySchema.optional(),
    }),
    z.strictObject({
      ok: z.literal(false),
      contractVersion: z.literal(CONTRACT_VERSION),
      error: ErrorSchema,
    }),
  ]);
}

export const ToolResultSchema = createToolResultSchema(z.unknown());

export type ArchitectureContract = z.infer<typeof ArchitectureSchema>;
export type ErrorContract = z.infer<typeof ErrorSchema>;
export type ExportFormat = z.infer<typeof ExportFormatSchema>;
export type ExportProjectionSettings = z.infer<
  typeof ExportProjectionSettingsSchema
>;
export type ExportResult = z.infer<typeof ExportResultSchema>;
export type MutationSummary = z.infer<typeof MutationSummarySchema>;
export type ToolInput = z.infer<typeof ToolInputSchema>;
export type ToolResult = z.infer<typeof ToolResultSchema>;
export type ValidationIssue = z.infer<typeof ValidationIssueSchema>;
