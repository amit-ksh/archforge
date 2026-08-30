import type { EntityId, IsoTimestamp } from "@/domain/architecture";

import type { ErrorContract } from "./schemas";

export type WebMcpActivityStatus = "running" | "succeeded" | "failed";
export type WebMcpToolBehavior = "read" | "mutation";

export interface WebMcpActivityEvent {
  readonly correlationId: string;
  readonly toolName: string;
  readonly toolTitle: string;
  readonly behavior: WebMcpToolBehavior;
  readonly status: WebMcpActivityStatus;
  readonly summary: string;
  readonly timestamp: IsoTimestamp;
  readonly affectedIds: readonly EntityId[];
  readonly error?: ErrorContract;
}

export interface WebMcpActivitySink {
  record(event: WebMcpActivityEvent): void | Promise<void>;
}
