import { z } from "zod";

import { EntityIdSchema } from "./schemas";

export const CapabilityDefinitionSchema = z.strictObject({
  id: EntityIdSchema,
  label: z.string().trim().min(1),
  description: z.string().trim().min(1),
  category: z.enum([
    "interface",
    "compute",
    "data",
    "messaging",
    "storage",
    "security",
    "observability",
    "networking",
  ]),
  iconKey: z.string().trim().min(1),
  connectionRoles: z.array(z.string().trim().min(1)).min(1),
});

export const TechnologyDefinitionSchema = z.strictObject({
  id: EntityIdSchema,
  label: z.string().trim().min(1),
  description: z.string().trim().min(1),
  capabilityIds: z.array(EntityIdSchema).min(1),
  useCases: z.array(z.string().trim().min(1)).min(1),
  strengths: z.array(z.string().trim().min(1)).min(1),
  tradeoffs: z.array(z.string().trim().min(1)).min(1),
  operationalTraits: z.strictObject({
    complexity: z.enum(["low", "medium", "high"]),
    scaling: z.enum(["vertical", "horizontal", "elastic"]),
    state: z.enum(["stateless", "stateful"]),
    skillTags: z.array(z.string().trim().min(1)),
  }),
});

export const ComponentCatalogRecordsSchema = z.strictObject({
  capabilities: z.array(CapabilityDefinitionSchema).min(1),
  technologies: z.array(TechnologyDefinitionSchema).min(1),
});

export type ComponentCatalogRecords = z.infer<
  typeof ComponentCatalogRecordsSchema
>;
