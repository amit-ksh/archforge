import {
  ToolResultSchema,
  createToolResultSchema,
  errorResult,
  structuredError,
  successResult,
  type ToolResult,
} from "@/application/contracts";
import type { Clock, IdGenerator } from "@/application/ports";

import {
  NoopWebMcpActivitySink,
  type WebMcpActivityEvent,
  type WebMcpActivitySink,
} from "./activity";
import type { WebMcpToolDefinition } from "./tool-definition";

function requestIdFrom(input: unknown): string | null {
  if (typeof input !== "object" || input === null || !("requestId" in input)) {
    return null;
  }
  const requestId = input.requestId;
  return typeof requestId === "string" && requestId.length > 0
    ? requestId
    : null;
}

export class WebMcpToolRuntime {
  constructor(
    private readonly clock: Clock,
    private readonly idGenerator: IdGenerator,
    private readonly activitySink: WebMcpActivitySink =
      new NoopWebMcpActivitySink(),
  ) {}

  async invoke(
    definition: WebMcpToolDefinition,
    input: unknown,
  ): Promise<ToolResult> {
    const correlationId =
      requestIdFrom(input) ?? this.idGenerator.next("webmcp-call");
    await this.emit({
      correlationId,
      toolName: definition.name,
      toolTitle: definition.title,
      behavior: definition.behavior,
      status: "running",
      summary: `Running ${definition.title}.`,
      timestamp: this.clock.now(),
      affectedIds: [],
    });

    try {
      const handled = await definition.execute(input, { correlationId });
      const value = definition.outputSchema.parse(handled.value);
      const result = createToolResultSchema(definition.outputSchema).parse(
        successResult(value, handled.mutation),
      );
      await this.emit({
        correlationId,
        toolName: definition.name,
        toolTitle: definition.title,
        behavior: definition.behavior,
        status: "succeeded",
        summary: handled.summary,
        timestamp: this.clock.now(),
        affectedIds: handled.mutation?.affectedIds ?? [],
      });
      return result;
    } catch (cause) {
      const error = structuredError(cause, correlationId);
      const result = ToolResultSchema.parse(errorResult(error));
      await this.emit({
        correlationId,
        toolName: definition.name,
        toolTitle: definition.title,
        behavior: definition.behavior,
        status: "failed",
        summary: error.message,
        timestamp: this.clock.now(),
        affectedIds: [],
        error,
      });
      return result;
    }
  }

  private async emit(event: WebMcpActivityEvent): Promise<void> {
    try {
      await this.activitySink.record(event);
    } catch {
      // Observability must never alter tool behavior.
    }
  }
}
