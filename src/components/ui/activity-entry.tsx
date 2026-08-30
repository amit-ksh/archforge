import { forwardRef, type HTMLAttributes } from "react";

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
  status: ActivityStatus;
  summary: string;
  timestamp: string;
  toolName: string;
}

export const ActivityEntry = forwardRef<HTMLElement, ActivityEntryProps>(
  function ActivityEntry(
    { className, detail, status, summary, timestamp, toolName, ...props },
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
          <span className={styles.activityTool}>{toolName}</span>
          <Badge tone={presentation.tone}>{presentation.label}</Badge>
        </div>
        <p className={styles.activitySummary}>{summary}</p>
        {detail ? <p className={styles.activityDetail}>{detail}</p> : null}
        <time className={styles.activityTime} dateTime={timestamp}>{timestamp}</time>
      </article>
    );
  },
);
