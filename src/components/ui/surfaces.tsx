import {
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
} from "react";

import styles from "./ui.module.css";
import { cx } from "./utils";

export type BadgeTone =
  | "neutral"
  | "info"
  | "success"
  | "warning"
  | "error"
  | "capability"
  | "technology"
  | "provider"
  | "service"
  | "existing"
  | "ai";

const badgeToneClass: Record<BadgeTone, string> = {
  neutral: styles.toneNeutral,
  info: styles.toneInfo,
  success: styles.toneSuccess,
  warning: styles.toneWarning,
  error: styles.toneError,
  capability: styles.toneCapability,
  technology: styles.toneTechnology,
  provider: styles.toneProvider,
  service: styles.toneService,
  existing: styles.toneExisting,
  ai: styles.toneAi,
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(function Badge(
  { className, tone = "neutral", ...props },
  ref,
) {
  return <span {...props} className={cx(styles.badge, badgeToneClass[tone], className)} ref={ref} />;
});

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { className, interactive = false, ...props },
  ref,
) {
  return <div {...props} className={cx(styles.card, interactive && styles.cardInteractive, className)} ref={ref} />;
});

export interface PanelProps extends HTMLAttributes<HTMLElement> {
  actions?: ReactNode;
  bodyClassName?: string;
  subtitle?: string;
  title: string;
}

export const Panel = forwardRef<HTMLElement, PanelProps>(function Panel(
  { actions, bodyClassName, children, className, subtitle, title, ...props },
  ref,
) {
  return (
    <section {...props} className={cx(styles.panel, className)} ref={ref}>
      <header className={styles.panelHeader}>
        <div>
          <h2 className={styles.panelTitle}>{title}</h2>
          {subtitle ? <p className={styles.panelSubtitle}>{subtitle}</p> : null}
        </div>
        {actions}
      </header>
      <div className={cx(styles.panelBody, bodyClassName)}>{children}</div>
    </section>
  );
});

export interface ToolbarProps extends HTMLAttributes<HTMLDivElement> {
  "aria-label": string;
}

export const Toolbar = forwardRef<HTMLDivElement, ToolbarProps>(function Toolbar(
  { className, ...props },
  ref,
) {
  return <div {...props} className={cx(styles.toolbar, className)} ref={ref} role="toolbar" />;
});

export interface InspectorShellProps extends HTMLAttributes<HTMLElement> {
  actions?: ReactNode;
  bodyClassName?: string;
  subtitle?: string;
  title: string;
}

export const InspectorShell = forwardRef<HTMLElement, InspectorShellProps>(
  function InspectorShell(
    { actions, bodyClassName, children, className, subtitle, title, ...props },
    ref,
  ) {
    return (
      <aside {...props} className={cx(styles.inspector, className)} ref={ref}>
        <header className={styles.inspectorHeader}>
          <div>
            <h2 className={styles.panelTitle}>{title}</h2>
            {subtitle ? <p className={styles.panelSubtitle}>{subtitle}</p> : null}
          </div>
          {actions}
        </header>
        <div className={cx(styles.inspectorBody, bodyClassName)}>{children}</div>
      </aside>
    );
  },
);
