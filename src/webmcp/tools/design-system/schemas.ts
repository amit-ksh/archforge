import { z } from "zod";

import {
  ConstraintSchema,
  EntityIdSchema,
  RequirementSchema,
  ValidationIssueSchema,
  createToolInputSchema,
} from "@/application/contracts";

const LocalKeySchema = EntityIdSchema.describe(
  "A request-local key used to correlate generated canonical IDs.",
);

const MetadataSchema = z.strictObject({
  name: z.string().trim().min(1),
  description: z.string().optional(),
});

const RequirementInputSchema = z.strictObject({
  key: LocalKeySchema,
  statement: RequirementSchema.shape.statement,
  category: RequirementSchema.shape.category,
  priority: RequirementSchema.shape.priority,
  target: z.string().trim().min(1).optional(),
});

const ConstraintInputSchema = z.strictObject({
  key: LocalKeySchema,
  kind: ConstraintSchema.shape.kind,
  statement: ConstraintSchema.shape.statement,
  severity: ConstraintSchema.shape.severity,
  value: ConstraintSchema.shape.value.unwrap().optional(),
  source: z.string().optional(),
});

const ProviderPreferenceSchema = z.strictObject({
  key: LocalKeySchema,
  providerId: EntityIdSchema,
  rationale: z.string().trim().min(1).optional(),
});

const ComponentInputSchema = z.strictObject({
  key: LocalKeySchema,
  capabilityId: EntityIdSchema,
  name: z.string().trim().min(1),
  description: z.string().optional(),
  position: z
    .strictObject({
      x: z.number().finite(),
      y: z.number().finite(),
    })
    .optional(),
  existingInfrastructure: z.boolean().optional(),
});

const ConnectionInputSchema = z.strictObject({
  key: LocalKeySchema,
  sourceComponentKey: LocalKeySchema,
  targetComponentKey: LocalKeySchema,
  relationship: z.enum([
    "dependency",
    "request",
    "data",
    "event",
    "control",
    "other",
  ]),
  label: z.string().optional(),
});

const ResolutionInputSchema = z
  .strictObject({
    componentKey: LocalKeySchema,
    technologyId: EntityIdSchema.optional(),
    providerId: EntityIdSchema.optional(),
    cloudServiceId: EntityIdSchema.optional(),
  })
  .refine(
    ({ technologyId, providerId, cloudServiceId }) =>
      technologyId !== undefined ||
      providerId !== undefined ||
      cloudServiceId !== undefined,
    { message: "At least one explicit resolution ID must be provided." },
  )
  .refine(
    ({ cloudServiceId, providerId }) =>
      cloudServiceId === undefined || providerId !== undefined,
    {
      message:
        "An explicit cloud service requires an explicit provider in the same resolution.",
      path: ["providerId"],
    },
  );

const DesignSystemPayloadSchema = z
  .strictObject({
    metadata: MetadataSchema,
    requirements: z.array(RequirementInputSchema).default([]),
    constraints: z.array(ConstraintInputSchema).default([]),
    providerPreference: ProviderPreferenceSchema.optional(),
    components: z.array(ComponentInputSchema).min(1),
    connections: z.array(ConnectionInputSchema).default([]),
    resolutions: z.array(ResolutionInputSchema).default([]),
  })
  .superRefine((payload, context) => {
    const checkUnique = (
      values: readonly { readonly key: string }[],
      path: "requirements" | "constraints" | "components" | "connections",
    ) => {
      const seen = new Set<string>();
      values.forEach(({ key }, index) => {
        if (seen.has(key)) {
          context.addIssue({
            code: "custom",
            message: `Duplicate local key '${key}'.`,
            path: [path, index, "key"],
          });
        }
        seen.add(key);
      });
    };
    checkUnique(payload.requirements, "requirements");
    checkUnique(payload.constraints, "constraints");
    checkUnique(payload.components, "components");
    checkUnique(payload.connections, "connections");

    if (
      payload.providerPreference &&
      payload.constraints.some(
        ({ key }) => key === payload.providerPreference?.key,
      )
    ) {
      context.addIssue({
        code: "custom",
        message: `Duplicate constraint key '${payload.providerPreference.key}'.`,
        path: ["providerPreference", "key"],
      });
    }

    const componentKeys = new Set(payload.components.map(({ key }) => key));
    payload.connections.forEach((connection, index) => {
      for (const field of [
        "sourceComponentKey",
        "targetComponentKey",
      ] as const) {
        if (!componentKeys.has(connection[field])) {
          context.addIssue({
            code: "custom",
            message: `Unknown component key '${connection[field]}'.`,
            path: ["connections", index, field],
          });
        }
      }
      if (connection.sourceComponentKey === connection.targetComponentKey) {
        context.addIssue({
          code: "custom",
          message: "A connection cannot target its source component.",
          path: ["connections", index, "targetComponentKey"],
        });
      }
    });

    const resolvedComponents = new Set<string>();
    payload.resolutions.forEach((resolution, index) => {
      if (!componentKeys.has(resolution.componentKey)) {
        context.addIssue({
          code: "custom",
          message: `Unknown component key '${resolution.componentKey}'.`,
          path: ["resolutions", index, "componentKey"],
        });
      }
      if (resolvedComponents.has(resolution.componentKey)) {
        context.addIssue({
          code: "custom",
          message: `Component '${resolution.componentKey}' has more than one resolution block.`,
          path: ["resolutions", index, "componentKey"],
        });
      }
      resolvedComponents.add(resolution.componentKey);
    });
  });

export const DesignSystemToolInputSchema = createToolInputSchema(
  DesignSystemPayloadSchema,
);

export const DesignSystemExecutedStepSchema = z.strictObject({
  key: EntityIdSchema,
  summary: z.string().min(1),
  affectedIds: z.array(EntityIdSchema),
  revision: z.number().int().nonnegative(),
});

export const DesignSystemIdCorrelationSchema = z.strictObject({
  kind: z.enum([
    "architecture",
    "requirement",
    "constraint",
    "component",
    "connection",
  ]),
  key: EntityIdSchema,
  id: EntityIdSchema,
});

export const DesignSystemUnresolvedDecisionSchema = z.strictObject({
  componentId: EntityIdSchema,
  componentKey: EntityIdSchema,
  level: z.enum(["technology", "provider", "cloud-service"]),
  reason: z.string().min(1),
});

export const DesignSystemToolOutputSchema = z.strictObject({
  architectureId: EntityIdSchema,
  finalRevision: z.number().int().nonnegative(),
  executedSteps: z.array(DesignSystemExecutedStepSchema),
  idCorrelations: z.array(DesignSystemIdCorrelationSchema),
  affectedIds: z.array(EntityIdSchema),
  validationIssues: z.array(ValidationIssueSchema),
  unresolvedDecisions: z.array(DesignSystemUnresolvedDecisionSchema),
});
