import type { Clock, IdGenerator } from "@/application/ports";

import type { WebMcpActivitySink } from "./activity";
import type { WebMcpModelContext } from "./browser-api";
import { WebMcpRegistrar } from "./registrar";
import type { WebMcpToolDefinition } from "./tool-definition";
import { WebMcpToolRuntime } from "./tool-runtime";

export interface CreateWebMcpRegistrarOptions {
  readonly clock: Clock;
  readonly idGenerator: IdGenerator;
  readonly activitySink?: WebMcpActivitySink;
  readonly modelContext?: WebMcpModelContext | null;
  readonly document?: Document | null;
}

export function createWebMcpRegistrar(
  options: CreateWebMcpRegistrarOptions,
): WebMcpRegistrar {
  const modelContext =
    options.modelContext ?? options.document?.modelContext ?? null;
  return new WebMcpRegistrar(
    modelContext,
    new WebMcpToolRuntime(
      options.clock,
      options.idGenerator,
      options.activitySink,
    ),
  );
}

export async function registerWebMcpTools(
  definitions: readonly WebMcpToolDefinition[],
  options: CreateWebMcpRegistrarOptions,
) {
  const registrar = createWebMcpRegistrar(options);
  const result = await registrar.register(definitions);
  return { registrar, result };
}
