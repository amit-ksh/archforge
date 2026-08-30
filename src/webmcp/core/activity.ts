import type { WebMcpActivitySink } from "@/application/contracts";

export type {
  WebMcpActivityEvent,
  WebMcpActivitySink,
  WebMcpActivityStatus,
  WebMcpToolBehavior,
} from "@/application/contracts";

export class NoopWebMcpActivitySink implements WebMcpActivitySink {
  record(): void {}
}
