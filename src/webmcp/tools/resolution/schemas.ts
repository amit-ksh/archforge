import { z } from "zod";

import {
  EntityIdSchema,
  ResolutionCandidateKindSchema,
  createToolInputSchema,
} from "@/application/contracts";

const ResolutionTargetSchema = z.strictObject({
  architectureId: EntityIdSchema,
  componentId: EntityIdSchema,
});

export const ListTechnologyOptionsToolInputSchema = createToolInputSchema(
  ResolutionTargetSchema,
);

export const SuggestImplementationsToolInputSchema = createToolInputSchema(
  ResolutionTargetSchema.extend({
    candidateKind: ResolutionCandidateKindSchema,
  }),
);

export const SetTechnologyToolInputSchema = createToolInputSchema(
  ResolutionTargetSchema.extend({
    technologyId: EntityIdSchema.nullable(),
  }),
);

export const SetProviderToolInputSchema = createToolInputSchema(
  ResolutionTargetSchema.extend({
    providerId: EntityIdSchema.nullable(),
  }),
);

export const SetCloudServiceToolInputSchema = createToolInputSchema(
  ResolutionTargetSchema.extend({
    cloudServiceId: EntityIdSchema.nullable(),
  }),
);
