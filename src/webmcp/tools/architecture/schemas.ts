import { z } from "zod";

import {
  ArchitectureSchema,
  EntityIdSchema,
  createToolInputSchema,
} from "@/application/contracts";

const ArchitectureMetadataPatchSchema = z
  .strictObject({
    name: z.string().trim().min(1).optional(),
    description: z.string().optional(),
  })
  .refine((patch) => Object.keys(patch).length > 0, {
    message: "At least one architecture field must be provided.",
  });

export const CreateArchitectureToolInputSchema = createToolInputSchema(
  z.strictObject({
    name: z.string().trim().min(1),
    description: z.string().optional(),
  }),
);

export const GetArchitectureToolInputSchema = createToolInputSchema(
  z.strictObject({ architectureId: EntityIdSchema }),
);

export const UpdateArchitectureToolInputSchema = createToolInputSchema(
  z.strictObject({
    architectureId: EntityIdSchema,
    patch: ArchitectureMetadataPatchSchema,
  }),
);

export const ClearArchitectureToolInputSchema = createToolInputSchema(
  z.strictObject({
    architectureId: EntityIdSchema,
    confirm: z.literal(true),
  }),
);

export { ArchitectureSchema as ArchitectureToolOutputSchema };
