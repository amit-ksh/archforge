"use client";

import { useSyncExternalStore } from "react";

import type { WebMcpActivityEvent } from "@/application/contracts";
import { ActivityEntry, Button, EmptyState } from "@/components/ui";
import type { EntityId } from "@/domain/architecture";

import type { ActivityStore } from "./activity-store";
import styles from "./activity.module.css";

interface ActivityPanelProps {
  readonly entityIds: ReadonlySet<EntityId>;
  readonly onNavigate: (entityId: EntityId) => void;
  readonly store: ActivityStore;
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime())
    ? "Time unavailable"
    : new Intl.DateTimeFormat(undefined, {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }).format(date);
}

function ActivityDetails({
  entityIds,
  event,
  onNavigate,
}: {
  readonly entityIds: ReadonlySet<EntityId>;
  readonly event: WebMcpActivityEvent;
  readonly onNavigate: (entityId: EntityId) => void;
}) {
  return (
    <dl className={styles.details}>
      <div>
        <dt>Tool ID</dt>
        <dd><code>{event.toolName}</code></dd>
      </div>
      <div>
        <dt>Behavior</dt>
        <dd>{event.behavior === "mutation" ? "Mutation" : "Read only"}</dd>
      </div>
      {event.affectedIds.length > 0 ? (
        <div>
          <dt>Affected entities</dt>
          <dd className={styles.entityLinks}>
            {event.affectedIds.map((entityId) =>
              entityIds.has(entityId) ? (
                <Button
                  key={entityId}
                  onClick={() => onNavigate(entityId)}
                  size="compact"
                  variant="ghost"
                >
                  {entityId}
                </Button>
              ) : (
                <span key={entityId} title="Entity is no longer available">
                  {entityId}
                </span>
              ),
            )}
          </dd>
        </div>
      ) : null}
      {event.error ? (
        <>
          <div>
            <dt>Error code</dt>
            <dd><code>{event.error.code}</code></dd>
          </div>
          <div>
            <dt>Recovery</dt>
            <dd>
              {event.error.retryable
                ? "Review the input and retry the tool."
                : "Review the error and current architecture state."}
            </dd>
          </div>
          <div>
            <dt>Correlation ID</dt>
            <dd><code>{event.correlationId}</code></dd>
          </div>
        </>
      ) : null}
    </dl>
  );
}

export function ActivityPanel({ entityIds, onNavigate, store }: ActivityPanelProps) {
  const events = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot,
  );
  const latestOutcome = events.find(({ status }) => status !== "running");

  if (events.length === 0) {
    return (
      <EmptyState
        message="WebMCP tool runs, mutations, and safe failure context will appear here for this browser session."
        title="No AI activity yet"
      />
    );
  }

  return (
    <div className={styles.panel}>
      <div className={styles.panelActions}>
        <span>{events.length} recent {events.length === 1 ? "action" : "actions"}</span>
        <Button onClick={() => store.clear()} size="compact" variant="ghost">
          Clear activity
        </Button>
      </div>
      {latestOutcome ? (
        <p className={styles.announcement} aria-live="polite" aria-atomic="true">
          {latestOutcome.toolTitle}: {latestOutcome.summary}
        </p>
      ) : null}
      <ol className={styles.list} aria-label="AI activity history">
        {events.map((event) => (
          <li key={event.correlationId}>
            <ActivityEntry
              details={
                <ActivityDetails
                  entityIds={entityIds}
                  event={event}
                  onNavigate={onNavigate}
                />
              }
              provenance="AI / WebMCP"
              status={event.status}
              summary={event.summary}
              timestamp={formatTimestamp(event.timestamp)}
              timestampValue={event.timestamp}
              toolName={event.toolTitle || event.toolName}
            />
          </li>
        ))}
      </ol>
    </div>
  );
}
