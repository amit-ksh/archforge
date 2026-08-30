import { z } from "zod";

import { EntityIdSchema } from "./schemas";

export const ResolutionCandidateKindSchema = z.enum([
  "technology",
  "provider",
  "cloud-service",
]);

export const ResolutionReasonSchema = z.strictObject({
  code: z.string().min(1),
  message: z.string().min(1),
  impact: z.number().finite(),
  evidenceIds: z.array(EntityIdSchema),
});

export const ResolutionConflictSchema = z.strictObject({
  code: z.string().min(1),
  message: z.string().min(1),
  candidateId: EntityIdSchema.nullable(),
  evidenceIds: z.array(EntityIdSchema),
});

export const ResolutionCandidateSchema = z.strictObject({
  candidateId: EntityIdSchema,
  candidateKind: ResolutionCandidateKindSchema,
  label: z.string().min(1),
  score: z.number().finite(),
  scoreBand: z.enum(["weak", "moderate", "strong"]),
  reasons: z.array(ResolutionReasonSchema),
  tradeoffs: z.array(z.string().min(1)),
  conflicts: z.array(ResolutionConflictSchema),
  evidenceIds: z.array(EntityIdSchema),
});

export const ResolutionResultSchema = z.strictObject({
  componentId: EntityIdSchema,
  candidateKind: ResolutionCandidateKindSchema,
  candidates: z.array(ResolutionCandidateSchema),
  conflicts: z.array(ResolutionConflictSchema),
});

export type ResolutionResultContract = z.infer<typeof ResolutionResultSchema>;
