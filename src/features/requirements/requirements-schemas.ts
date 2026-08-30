import { z } from "zod";

export const RequirementDraftSchema = z.strictObject({
  statement: z.string().trim().min(1, "Enter a requirement statement.").max(500),
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
  target: z.string().trim().max(200),
});

export const ConstraintDraftSchema = z.strictObject({
  statement: z.string().trim().min(1, "Enter a constraint statement.").max(500),
  kind: z.enum([
    "provider",
    "residency",
    "budget",
    "skill",
    "existing-infrastructure",
    "operational",
    "other",
  ]),
  severity: z.enum(["hard", "preference"]),
  value: z.string().trim().max(300),
  source: z.string().trim().max(300),
});

export type RequirementDraft = z.infer<typeof RequirementDraftSchema>;
export type ConstraintDraft = z.infer<typeof ConstraintDraftSchema>;
export type FormErrors = Readonly<Record<string, string>>;

export function formErrors(error: z.ZodError): FormErrors {
  return Object.fromEntries(
    error.issues.map((issue) => [String(issue.path[0] ?? "form"), issue.message]),
  );
}
