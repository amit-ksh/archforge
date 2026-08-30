import { z } from "zod";

import {
  CapabilityDefinitionSchema,
  ComponentSchema,
  ConnectionSchema,
  EntityIdSchema,
  createToolInputSchema,
} from "@/application/contracts";

const PositionSchema = ComponentSchema.shape.position;
const ComponentFieldsSchema = z.strictObject({
  capabilityId: EntityIdSchema,
  name: z.string().trim().min(1),
  description: z.string().optional(),
  position: PositionSchema.optional(),
  existingInfrastructure: z.boolean().optional(),
});

const ComponentPatchSchema = z
  .strictObject({
    capabilityId: EntityIdSchema.optional(),
    name: z.string().trim().min(1).optional(),
    description: z.string().optional(),
    position: PositionSchema.optional(),
    existingInfrastructure: z.boolean().optional(),
  })
  .refine((patch) => Object.keys(patch).length > 0, {
    message: "At least one component field must be provided.",
  });

export const ListComponentTypesToolInputSchema = createToolInputSchema(
  z.strictObject({
    category: CapabilityDefinitionSchema.shape.category.optional(),
  }),
);

export const AddComponentToolInputSchema = createToolInputSchema(
  z.strictObject({
    architectureId: EntityIdSchema,
    component: ComponentFieldsSchema,
  }),
);

export const GetComponentToolInputSchema = createToolInputSchema(
  z.strictObject({
    architectureId: EntityIdSchema,
    componentId: EntityIdSchema,
  }),
);

export const UpdateComponentToolInputSchema = createToolInputSchema(
  z.strictObject({
    architectureId: EntityIdSchema,
    componentId: EntityIdSchema,
    patch: ComponentPatchSchema,
  }),
);

export const RemoveComponentToolInputSchema = createToolInputSchema(
  z.strictObject({
    architectureId: EntityIdSchema,
    componentId: EntityIdSchema,
  }),
);

export const ComponentTypeListSchema = z.array(CapabilityDefinitionSchema);
export const ComponentContextSchema = z.strictObject({
  component: ComponentSchema,
  connections: z.array(ConnectionSchema),
  resolution: z.strictObject({
    technologyId: EntityIdSchema.nullable(),
    providerId: EntityIdSchema.nullable(),
    cloudServiceId: EntityIdSchema.nullable(),
  }),
});
export const RemovedComponentSchema = z.strictObject({
  removedComponentId: EntityIdSchema,
  removedConnectionIds: z.array(EntityIdSchema),
});
