import { z } from "zod";

import {
  EntityIdSchema,
  ValidationIssueSchema,
  createToolInputSchema,
} from "@/application/contracts";

export const ArchitectureAnalysisToolInputSchema = createToolInputSchema(
  z.strictObject({ architectureId: EntityIdSchema }),
);

export const ValidationIssueListSchema = z.array(ValidationIssueSchema);

export const ReviewFindingSchema = z.strictObject({
  summary: z.string().min(1),
  evidenceIds: z.array(EntityIdSchema).min(1),
});

export const ReviewGapSchema = ReviewFindingSchema.extend({
  nextStep: z.string().min(1),
});

export const ArchitectureReviewSchema = z.strictObject({
  strengths: z.array(ReviewFindingSchema),
  gaps: z.array(ReviewGapSchema),
  unresolvedDecisions: z.array(ReviewGapSchema),
});

export const ArchitectureRiskSchema = z.strictObject({
  id: EntityIdSchema,
  severity: z.enum(["low", "medium", "high"]),
  evidence: z.string().min(1),
  affectedEntityIds: z.array(EntityIdSchema).min(1),
  mitigation: z.string().min(1),
});

export const ArchitectureRiskListSchema = z.array(ArchitectureRiskSchema);

export type ArchitectureReview = z.infer<typeof ArchitectureReviewSchema>;
export type ArchitectureRisk = z.infer<typeof ArchitectureRiskSchema>;
