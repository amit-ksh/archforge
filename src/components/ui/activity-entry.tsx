import { forwardRef, type HTMLAttributes, type ReactNode } from "react";

import { Badge, type BadgeTone } from "./surfaces";
import styles from "./ui.module.css";
import { cx } from "./utils";

export type ActivityStatus = "running" | "succeeded" | "failed";

const statusPresentation: Record<ActivityStatus, { label: string; tone: BadgeTone }> = {
  running: { label: "Running", tone: "info" },
  succeeded: { label: "Succeeded", tone: "success" },
  failed: { label: "Failed", tone: "error" },
};

export interface ActivityEntryProps extends HTMLAttributes<HTMLElement> {
  detail?: string;
  details?: ReactNode;
  provenance?: string;
  status: ActivityStatus;
  summary: string;
  timestamp: string;
  timestampValue?: string;
  toolName: string;
}

export const ActivityEntry = forwardRef<HTMLElement, ActivityEntryProps>(
  function ActivityEntry(
    {
      className,
      detail,
      details,
      provenance,
      status,
      summary,
      timestamp,
      timestampValue,
      toolName,
      ...props
    },
    ref,
  ) {
    const presentation = statusPresentation[status];

    return (
      <article
        {...props}
        aria-live={status === "running" ? "polite" : undefined}
        className={cx(styles.activityEntry, className)}
        ref={ref}
      >
        <div className={styles.activityHeader}>
          <span className={styles.activityIdentity}>
            <span className={styles.activityTool}>{toolName}</span>
            {provenance ? <Badge tone="ai">{provenance}</Badge> : null}
          </span>
          <Badge tone={presentation.tone}>{presentation.label}</Badge>
        </div>
        <p className={styles.activitySummary}>{summary}</p>
        {detail ? <p className={styles.activityDetail}>{detail}</p> : null}
        {details ? (
          <details className={styles.activityDetails}>
            <summary>Details</summary>
            <div>{details}</div>
          </details>
        ) : null}
        <time className={styles.activityTime} dateTime={timestampValue ?? timestamp}>
          {timestamp}
        </time>
      </article>
    );
  },
);
