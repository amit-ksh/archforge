import {
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
} from "react";

import styles from "./ui.module.css";
import { cx } from "./utils";

interface StateProps extends HTMLAttributes<HTMLDivElement> {
  action?: ReactNode;
  message: string;
  title: string;
}

export const EmptyState = forwardRef<HTMLDivElement, StateProps>(function EmptyState(
  { action, className, message, title, ...props },
  ref,
) {
  return (
    <div {...props} className={cx(styles.state, className)} ref={ref}>
      <h3 className={styles.stateTitle}>{title}</h3>
      <p className={styles.stateMessage}>{message}</p>
      {action ? <div className={styles.stateAction}>{action}</div> : null}
    </div>
  );
});

export const ErrorState = forwardRef<HTMLDivElement, StateProps>(function ErrorState(
  { action, className, message, title, ...props },
  ref,
) {
  return (
    <div {...props} className={cx(styles.state, styles.errorState, className)} ref={ref} role="alert">
      <h3 className={styles.stateTitle}>{title}</h3>
      <p className={styles.stateMessage}>{message}</p>
      {action ? <div className={styles.stateAction}>{action}</div> : null}
    </div>
  );
});

export type ValidationSeverity = "info" | "warning" | "error" | "success";

const validationToneClass: Record<ValidationSeverity, string> = {
  info: styles.toneInfo,
  warning: styles.toneWarning,
  error: styles.toneError,
  success: styles.toneSuccess,
};

export interface ValidationMessageProps extends HTMLAttributes<HTMLDivElement> {
  severity?: ValidationSeverity;
}

export const ValidationMessage = forwardRef<HTMLDivElement, ValidationMessageProps>(
  function ValidationMessage({ children, className, severity = "info", ...props }, ref) {
    const urgent = severity === "error";
    return (
      <div
        {...props}
        aria-live={urgent ? "assertive" : "polite"}
        className={cx(styles.validation, validationToneClass[severity], className)}
        ref={ref}
        role={urgent ? "alert" : "status"}
      >
        <strong>{severity[0]?.toUpperCase()}{severity.slice(1)}</strong>
        <div>{children}</div>
      </div>
    );
  },
);

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  label?: string;
}

export const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(function Skeleton(
  { className, label = "Loading", ...props },
  ref,
) {
  return (
    <div {...props} className={cx(styles.skeleton, className)} ref={ref} role="status">
      <span className={styles.visuallyHidden}>{label}</span>
    </div>
  );
});
