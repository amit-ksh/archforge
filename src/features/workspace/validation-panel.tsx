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
        <Skeleton label="Validating architecture rules..." />
        <Skeleton label="Checking component resolutions..." />
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
        message="All architecture rules, capability bindings, and contracts are valid."
        title="No validation issues found"
      />
    );
  }

  return (
    <div className={styles.inspectorBody}>
      <div className={styles.sectionHeaderRow}>
        <h4>Deterministic Signals ({issues.length})</h4>
      </div>

      <div className={styles.cardsList}>
        {issues.map((issue) => {
          const componentId = issue.affectedEntityIds.find((id) =>
            architectureComponentIds.has(id),
          );
          return (
            <div className={styles.validationCard} key={issue.id}>
              <div className={styles.validationCardTop}>
                <Badge tone={toneBySeverity[issue.severity]}>
                  {issue.severity.toUpperCase()}
                </Badge>
                <code className={styles.ruleCode}>{issue.rule}</code>
              </div>

              <strong className={styles.validationCardMessage}>{issue.message}</strong>
              <p className={styles.validationCardAction}>{issue.suggestedAction}</p>

              {componentId ? (
                <div className={styles.validationCardFooter}>
                  <Button
                    onClick={() => onNavigate(componentId)}
                    size="compact"
                    variant="secondary"
                  >
                    Inspect Component
                  </Button>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
