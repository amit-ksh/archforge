import type {
  ErrorContract,
  WebMcpActivityEvent,
  WebMcpActivitySink,
} from "@/application/contracts";

const DEFAULT_ACTIVITY_LIMIT = 50;
const MAX_SUMMARY_LENGTH = 320;
const MAX_LABEL_LENGTH = 120;
const MAX_AFFECTED_IDS = 20;

export type ActivityStoreListener = (event: WebMcpActivityEvent | null) => void;

function safeText(value: string, maximum: number, fallback: string): string {
  const sanitized = value
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return (sanitized || fallback).slice(0, maximum);
}

function sanitizeError(error: ErrorContract): ErrorContract {
  return {
    code: safeText(error.code, MAX_LABEL_LENGTH, "UNEXPECTED_ERROR"),
    message: safeText(
      error.message,
      MAX_SUMMARY_LENGTH,
      "The tool could not complete.",
    ),
    retryable: error.retryable,
    correlationId: safeText(
      error.correlationId,
      MAX_LABEL_LENGTH,
      "unknown-correlation",
    ),
    ...(error.fieldIssues
      ? {
          fieldIssues: error.fieldIssues.slice(0, 10).map((issue) => ({
            path: issue.path.slice(0, 8),
            message: safeText(
              issue.message,
              MAX_SUMMARY_LENGTH,
              "Invalid field.",
            ),
          })),
        }
      : {}),
  };
}

function sanitizeEvent(event: WebMcpActivityEvent): WebMcpActivityEvent {
  const affectedIds = [
    ...new Set(
      event.affectedIds
        .map((id) => safeText(id, MAX_LABEL_LENGTH, ""))
        .filter(Boolean),
    ),
  ].slice(0, MAX_AFFECTED_IDS);
  return Object.freeze({
    ...event,
    correlationId: safeText(
      event.correlationId,
      MAX_LABEL_LENGTH,
      "unknown-correlation",
    ),
    ...(event.parentCorrelationId
      ? {
          parentCorrelationId: safeText(
            event.parentCorrelationId,
            MAX_LABEL_LENGTH,
            "unknown-parent",
          ),
        }
      : {}),
    toolName: safeText(event.toolName, MAX_LABEL_LENGTH, "unknown_tool"),
    toolTitle: safeText(event.toolTitle, MAX_LABEL_LENGTH, "Unknown tool"),
    summary: safeText(
      event.summary,
      MAX_SUMMARY_LENGTH,
      "WebMCP activity updated.",
    ),
    affectedIds: Object.freeze(affectedIds),
    ...(event.error ? { error: sanitizeError(event.error) } : {}),
  });
}

export class ActivityStore implements WebMcpActivitySink {
  private events: readonly WebMcpActivityEvent[] = Object.freeze([]);
  private readonly listeners = new Set<ActivityStoreListener>();

  constructor(private readonly limit: number = DEFAULT_ACTIVITY_LIMIT) {
    if (!Number.isInteger(limit) || limit < 1) {
      throw new Error("Activity retention limit must be a positive integer.");
    }
  }

  getSnapshot = (): readonly WebMcpActivityEvent[] => this.events;

  subscribe = (listener: ActivityStoreListener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  record(event: WebMcpActivityEvent): void {
    const sanitized = sanitizeEvent(event);
    const existingIndex = this.events.findIndex(
      ({ correlationId }) => correlationId === sanitized.correlationId,
    );
    const next =
      existingIndex >= 0
        ? [
            sanitized,
            ...this.events.filter((_, index) => index !== existingIndex),
          ]
        : [sanitized, ...this.events].slice(0, this.limit);
    this.events = Object.freeze(next);
    this.emit(sanitized);
  }

  clear(): void {
    if (this.events.length === 0) return;
    this.events = Object.freeze([]);
    this.emit(null);
  }

  private emit(event: WebMcpActivityEvent | null): void {
    for (const listener of this.listeners) listener(event);
  }
}
