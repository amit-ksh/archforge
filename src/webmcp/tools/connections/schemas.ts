import { z } from "zod";

import {
  ConnectionSchema,
  EntityIdSchema,
  createToolInputSchema,
} from "@/application/contracts";

const ConnectionFieldsSchema = z.strictObject({
  sourceComponentId: EntityIdSchema,
  targetComponentId: EntityIdSchema,
  relationship: ConnectionSchema.shape.relationship,
  label: z.string().optional(),
});

const ConnectionPatchSchema = z
  .strictObject({
    sourceComponentId: EntityIdSchema.optional(),
    targetComponentId: EntityIdSchema.optional(),
    relationship: ConnectionSchema.shape.relationship.optional(),
    label: z.string().optional(),
  })
  .refine((patch) => Object.keys(patch).length > 0, {
    message: "At least one connection field must be provided.",
  });

export const ConnectComponentsToolInputSchema = createToolInputSchema(
  z.strictObject({
    architectureId: EntityIdSchema,
    connection: ConnectionFieldsSchema,
  }),
);

export const UpdateConnectionToolInputSchema = createToolInputSchema(
  z.strictObject({
    architectureId: EntityIdSchema,
    connectionId: EntityIdSchema,
    patch: ConnectionPatchSchema,
  }),
);

export const RemoveConnectionToolInputSchema = createToolInputSchema(
  z.strictObject({
    architectureId: EntityIdSchema,
    connectionId: EntityIdSchema,
  }),
);

export const RemovedConnectionSchema = z.strictObject({
  removedConnectionId: EntityIdSchema,
});
