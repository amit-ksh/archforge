import { z } from "zod";

import {
  EntityIdSchema,
  RequirementSchema,
  createToolInputSchema,
} from "@/application/contracts";

const RequirementFieldsSchema = z.strictObject({
  statement: RequirementSchema.shape.statement,
  category: RequirementSchema.shape.category,
  priority: RequirementSchema.shape.priority,
  target: RequirementSchema.shape.target.optional(),
});

const RequirementPatchSchema = RequirementFieldsSchema.partial().refine(
  (patch) => Object.keys(patch).length > 0,
  { message: "At least one requirement field must be provided." },
);

export const AddRequirementToolInputSchema = createToolInputSchema(
  z.strictObject({
    architectureId: EntityIdSchema,
    requirement: RequirementFieldsSchema,
  }),
);

export const UpdateRequirementToolInputSchema = createToolInputSchema(
  z.strictObject({
    architectureId: EntityIdSchema,
    requirementId: EntityIdSchema,
    patch: RequirementPatchSchema,
  }),
);

export const RemoveRequirementToolInputSchema = createToolInputSchema(
  z.strictObject({
    architectureId: EntityIdSchema,
    requirementId: EntityIdSchema,
  }),
);

export const ListRequirementsToolInputSchema = createToolInputSchema(
  z.strictObject({
    architectureId: EntityIdSchema,
    category: RequirementSchema.shape.category.optional(),
    priority: RequirementSchema.shape.priority.optional(),
  }),
);

export const RemovedRequirementSchema = z.strictObject({
  removedRequirementId: EntityIdSchema,
});

export const RequirementListSchema = z.array(RequirementSchema);
