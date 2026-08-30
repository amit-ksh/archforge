"use client";

import type { ValidationIssue } from "@/application/contracts";
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  Skeleton,
} from "@/components/ui";
import type { EntityId } from "@/domain/architecture";

import styles from "./workspace.module.css";

interface ValidationPanelProps {
  readonly architectureComponentIds: ReadonlySet<EntityId>;
  readonly error: string | null;
  readonly issues: readonly ValidationIssue[];
  readonly loading: boolean;
  readonly onNavigate: (componentId: EntityId) => void;
  readonly onRetry: () => Promise<void>;
}

const toneBySeverity = {
  error: "error",
  warning: "warning",
  info: "info",
} as const;

export function ValidationPanel({
  architectureComponentIds,
  error,
  issues,
  loading,
  onNavigate,
  onRetry,
}: ValidationPanelProps) {
  if (loading && issues.length === 0) {
    return (
      <div className={styles.validationLoading}>
        <Skeleton label="Validating architecture" />
        <Skeleton label="Checking architecture rules" />
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        action={
          <Button onClick={() => void onRetry()} size="compact" variant="secondary">
            Retry validation
          </Button>
        }
        message={error}
        title="Validation unavailable"
      />
    );
  }

  if (issues.length === 0) {
    return (
      <EmptyState
        message="No architecture rules currently report a problem."
        title="No validation issues"
      />
    );
  }

  return (
    <ul className={styles.validationList}>
      {issues.map((issue) => {
        const componentId = issue.affectedEntityIds.find((id) =>
          architectureComponentIds.has(id),
        );
        return (
          <li key={issue.id}>
            <div
              className={styles.validationIssue}
              id={`validation-${issue.id}`}
              tabIndex={-1}
            >
              <Badge tone={toneBySeverity[issue.severity]}>
                {issue.severity}
              </Badge>
              <div>
                <strong>{issue.message}</strong>
                <p>{issue.suggestedAction}</p>
                <code>{issue.rule}</code>
              </div>
              {componentId ? (
                <Button
                  onClick={() => onNavigate(componentId)}
                  size="compact"
                  variant="ghost"
                >
                  Inspect
                </Button>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
