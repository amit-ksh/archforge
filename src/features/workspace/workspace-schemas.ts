import { z } from "zod";

import { EntityIdSchema } from "@/application/contracts";

export const ArchitectureDraftSchema = z.strictObject({
  name: z.string().trim().min(1, "Enter a system name.").max(100),
});

export const ComponentDraftSchema = z.strictObject({
  capabilityId: EntityIdSchema,
  name: z.string().trim().min(1, "Enter a component name.").max(100),
  description: z.string().trim().max(500),
  existingInfrastructure: z.boolean(),
});

export const ConnectionDraftSchema = z
  .strictObject({
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
    label: z.string().trim().max(80),
  })
  .refine(
    ({ sourceComponentId, targetComponentId }) =>
      sourceComponentId !== targetComponentId,
    {
      path: ["targetComponentId"],
      message: "Choose a different target component.",
    },
  );

export type ArchitectureDraft = z.infer<typeof ArchitectureDraftSchema>;
export type ComponentDraft = z.infer<typeof ComponentDraftSchema>;
export type ConnectionDraft = z.infer<typeof ConnectionDraftSchema>;

export type FieldErrors = Readonly<Record<string, string>>;

export function fieldErrors(error: z.ZodError): FieldErrors {
  return Object.fromEntries(
    error.issues.map((issue) => [String(issue.path[0] ?? "form"), issue.message]),
  );
}
