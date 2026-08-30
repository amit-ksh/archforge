"use client";

import { useMemo, useState, type FormEvent } from "react";

import type { ArchitectureCommand } from "@/application/commands";
import type { ValidationIssue } from "@/application/contracts";
import {
  Badge,
  Button,
  Dialog,
  EmptyState,
  ErrorState,
  Input,
  Select,
  TextArea,
} from "@/components/ui";
import type {
  Architecture,
  Constraint,
  ConstraintKind,
  ConstraintSeverity,
  EntityId,
  Requirement,
  RequirementCategory,
  RequirementPriority,
} from "@/domain/architecture";

import {
  ConstraintDraftSchema,
  RequirementDraftSchema,
  formErrors,
  type ConstraintDraft,
  type FormErrors,
  type RequirementDraft,
} from "./requirements-schemas";
import styles from "./requirements.module.css";

export type EvidenceSection = "requirements" | "constraints";

interface RequirementsWorkspaceProps {
  readonly architecture: Architecture;
  readonly dispatchCommand: (command: ArchitectureCommand) => Promise<void>;
  readonly issues: readonly ValidationIssue[];
  readonly nextId: (prefix: string) => EntityId;
  readonly onInspectIssue: (issueId: EntityId) => void;
  readonly section: EvidenceSection;
}

const REQUIREMENT_CATEGORIES: readonly RequirementCategory[] = [
  "functional",
  "performance",
  "reliability",
  "security",
  "compliance",
  "operability",
  "cost",
  "other",
];

const REQUIREMENT_PRIORITIES: readonly RequirementPriority[] = [
  "critical",
  "high",
  "medium",
  "low",
];

const CONSTRAINT_KINDS: readonly ConstraintKind[] = [
  "provider",
  "residency",
  "budget",
  "skill",
  "existing-infrastructure",
  "operational",
  "other",
];

const CONSTRAINT_SEVERITIES: readonly ConstraintSeverity[] = [
  "hard",
  "preference",
];

const REQUIREMENT_INITIAL: RequirementDraft = {
  statement: "",
  category: "functional",
  priority: "medium",
  target: "",
};

const CONSTRAINT_INITIAL: ConstraintDraft = {
  statement: "",
  kind: "operational",
  severity: "preference",
  value: "",
  source: "",
};

const PRIORITY_WEIGHT: Readonly<Record<RequirementPriority, number>> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

const OPERATIONAL_PATTERNS: readonly {
  label: string;
  statement: string;
  value: string;
}[] = [
  {
    label: "Low complexity",
    statement: "Prefer low operational complexity.",
    value: "low",
  },
  {
    label: "Elastic scaling",
    statement: "Prefer an elastic scaling model.",
    value: "elastic",
  },
  {
    label: "Stateless",
    statement: "Prefer stateless workload implementations.",
    value: "stateless",
  },
  {
    label: "Stateful",
    statement: "Prefer stateful workload implementations.",
    value: "stateful",
  },
];

function requirementDraft(requirement: Requirement): RequirementDraft {
  return {
    statement: requirement.statement,
    category: requirement.category,
    priority: requirement.priority,
    target: requirement.target ?? "",
  };
}

function constraintDraft(constraint: Constraint): ConstraintDraft {
  const value = Array.isArray(constraint.value)
    ? constraint.value.join(", ")
    : constraint.value === null
      ? ""
      : String(constraint.value);
  return {
    statement: constraint.statement,
    kind: constraint.kind,
    severity: constraint.severity,
    value,
    source: constraint.source,
  };
}

function constraintValue(value: string): string | readonly string[] | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!trimmed.includes(",")) return trimmed;
  return trimmed
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function issuesFor(
  entityId: EntityId,
  issues: readonly ValidationIssue[],
): readonly ValidationIssue[] {
  return issues.filter(({ affectedEntityIds }) =>
    affectedEntityIds.includes(entityId),
  );
}

function isHttpSource(source: string): boolean {
  try {
    const url = new URL(source);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function EvidenceIssueLinks({
  entityId,
  issues,
  onInspectIssue,
}: {
  readonly entityId: EntityId;
  readonly issues: readonly ValidationIssue[];
  readonly onInspectIssue: (issueId: EntityId) => void;
}) {
  const affected = issuesFor(entityId, issues);
  if (affected.length === 0) {
    return <span className={styles.noIssues}>No affected validation issues</span>;
  }
  return (
    <div className={styles.issueLinks} aria-label="Affected validation issues">
      {affected.map((issue) => (
        <button
          key={issue.id}
          onClick={() => onInspectIssue(issue.id)}
          type="button"
        >
          {issue.severity}: {issue.rule}
        </button>
      ))}
    </div>
  );
}

function RequirementEditor({
  architecture,
  dispatchCommand,
  issues,
  nextId,
  onInspectIssue,
}: Omit<RequirementsWorkspaceProps, "section">) {
  const [editingId, setEditingId] = useState<EntityId | null>(null);
  const [draft, setDraft] = useState<RequirementDraft>(REQUIREMENT_INITIAL);
  const [errors, setErrors] = useState<FormErrors>({});
  const [requestError, setRequestError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Requirement | null>(null);
  const [sort, setSort] = useState<"priority" | "category" | "created">(
    "priority",
  );
  const requirements = useMemo(() => {
    const values = [...architecture.requirements];
    if (sort === "priority") {
      return values.sort(
        (left, right) =>
          PRIORITY_WEIGHT[right.priority] - PRIORITY_WEIGHT[left.priority] ||
          left.statement.localeCompare(right.statement, "en"),
      );
    }
    if (sort === "category") {
      return values.sort(
        (left, right) =>
          left.category.localeCompare(right.category, "en") ||
          left.statement.localeCompare(right.statement, "en"),
      );
    }
    return values;
  }, [architecture.requirements, sort]);

  function reset() {
    setEditingId(null);
    setDraft(REQUIREMENT_INITIAL);
    setErrors({});
    setRequestError(null);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = RequirementDraftSchema.safeParse(draft);
    if (!parsed.success) {
      setErrors(formErrors(parsed.error));
      return;
    }

    setSaving(true);
    setErrors({});
    setRequestError(null);
    const requirement = {
      ...parsed.data,
      target: parsed.data.target || null,
    };
    try {
      if (editingId) {
        await dispatchCommand({
          type: "requirement.update",
          architectureId: architecture.id,
          requirementId: editingId,
          patch: requirement,
        });
      } else {
        await dispatchCommand({
          type: "requirement.add",
          architectureId: architecture.id,
          requirement: { id: nextId("requirement"), ...requirement },
        });
      }
      reset();
    } catch (cause) {
      setRequestError(
        cause instanceof Error
          ? cause.message
          : "The requirement could not be saved. Your draft is preserved.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!deleteTarget) return;
    setSaving(true);
    setRequestError(null);
    try {
      await dispatchCommand({
        type: "requirement.remove",
        architectureId: architecture.id,
        requirementId: deleteTarget.id,
      });
      if (editingId === deleteTarget.id) reset();
      setDeleteTarget(null);
    } catch (cause) {
      setRequestError(
        cause instanceof Error
          ? cause.message
          : "The requirement could not be removed.",
      );
      setDeleteTarget(null);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className={styles.workspaceSection}>
        <div className={styles.sectionHeader}>
          <div>
            <h3>Requirements</h3>
            <p>Desired behavior and measurable quality outcomes.</p>
          </div>
          <Button onClick={reset} size="compact" variant="secondary">
            Add
          </Button>
        </div>

        <form className={styles.evidenceForm} onSubmit={save}>
          <h4>{editingId ? "Edit requirement" : "New requirement"}</h4>
          {requestError ? (
            <ErrorState
              action={
                <Button size="compact" type="submit" variant="secondary">
                  Retry
                </Button>
              }
              message={requestError}
              title="Requirement change failed"
            />
          ) : null}
          <TextArea
            error={errors.statement}
            label="Statement"
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                statement: event.target.value,
              }))
            }
            placeholder="The API must remain available during a zone failure."
            required
            value={draft.statement}
          />
          <div className={styles.fieldRow}>
            <Select
              error={errors.category}
              label="Category"
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  category: event.target.value as RequirementCategory,
                }))
              }
              value={draft.category}
            >
              {REQUIREMENT_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </Select>
            <Select
              error={errors.priority}
              label="Priority"
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  priority: event.target.value as RequirementPriority,
                }))
              }
              value={draft.priority}
            >
              {REQUIREMENT_PRIORITIES.map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </Select>
          </div>
          <Input
            error={errors.target}
            helperText="Optional measurable outcome or threshold."
            label="Target"
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                target: event.target.value,
              }))
            }
            placeholder="99.95% monthly availability"
            value={draft.target}
          />
          <div className={styles.formActions}>
            <Button busy={saving} type="submit">
              {editingId ? "Save requirement" : "Add requirement"}
            </Button>
            {editingId ? (
              <Button onClick={reset} variant="secondary">
                Cancel
              </Button>
            ) : null}
          </div>
        </form>

        <div className={styles.listToolbar}>
          <strong>Saved ({requirements.length})</strong>
          <label>
            <span>Sort</span>
            <select
              aria-label="Sort requirements"
              onChange={(event) =>
                setSort(event.target.value as typeof sort)
              }
              value={sort}
            >
              <option value="priority">Priority</option>
              <option value="category">Category</option>
              <option value="created">Created</option>
            </select>
          </label>
        </div>
        {requirements.length === 0 ? (
          <EmptyState
            message="Add the first desired outcome so validation and resolution have explicit evidence."
            title="No requirements yet"
          />
        ) : (
          <ul className={styles.evidenceList}>
            {requirements.map((requirement) => (
              <li key={requirement.id}>
                <article className={styles.evidenceCard}>
                  <div className={styles.cardBadges}>
                    <Badge
                      tone={
                        requirement.priority === "critical"
                          ? "error"
                          : requirement.priority === "high"
                            ? "warning"
                            : "neutral"
                      }
                    >
                      {requirement.priority}
                    </Badge>
                    <Badge tone="info">{requirement.category}</Badge>
                  </div>
                  <p>{requirement.statement}</p>
                  {requirement.target ? (
                    <dl>
                      <dt>Target</dt>
                      <dd>{requirement.target}</dd>
                    </dl>
                  ) : null}
                  <EvidenceIssueLinks
                    entityId={requirement.id}
                    issues={issues}
                    onInspectIssue={onInspectIssue}
                  />
                  <div className={styles.cardActions}>
                    <Button
                      onClick={() => {
                        setEditingId(requirement.id);
                        setDraft(requirementDraft(requirement));
                        setErrors({});
                        setRequestError(null);
                      }}
                      size="compact"
                      variant="ghost"
                    >
                      Edit
                    </Button>
                    <Button
                      onClick={() => setDeleteTarget(requirement)}
                      size="compact"
                      variant="ghost"
                    >
                      Delete
                    </Button>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        )}
      </div>
      <Dialog
        description="Any decision evidence links to this requirement will also be removed."
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        open={deleteTarget !== null}
        title="Delete requirement?"
      >
        <p className={styles.confirmCopy}>{deleteTarget?.statement}</p>
        <div className={styles.dialogActions}>
          <Button onClick={() => setDeleteTarget(null)} variant="secondary">
            Cancel
          </Button>
          <Button busy={saving} onClick={() => void remove()} variant="danger">
            Delete requirement
          </Button>
        </div>
      </Dialog>
    </>
  );
}

function ConstraintEditor({
  architecture,
  dispatchCommand,
  issues,
  nextId,
  onInspectIssue,
}: Omit<RequirementsWorkspaceProps, "section">) {
  const [editingId, setEditingId] = useState<EntityId | null>(null);
  const [draft, setDraft] = useState<ConstraintDraft>(CONSTRAINT_INITIAL);
  const [errors, setErrors] = useState<FormErrors>({});
  const [requestError, setRequestError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Constraint | null>(null);

  function reset() {
    setEditingId(null);
    setDraft(CONSTRAINT_INITIAL);
    setErrors({});
    setRequestError(null);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = ConstraintDraftSchema.safeParse(draft);
    if (!parsed.success) {
      setErrors(formErrors(parsed.error));
      return;
    }

    setSaving(true);
    setErrors({});
    setRequestError(null);
    const constraint = {
      ...parsed.data,
      value: constraintValue(parsed.data.value),
    };
    try {
      if (editingId) {
        await dispatchCommand({
          type: "constraint.update",
          architectureId: architecture.id,
          constraintId: editingId,
          patch: constraint,
        });
      } else {
        await dispatchCommand({
          type: "constraint.add",
          architectureId: architecture.id,
          constraint: { id: nextId("constraint"), ...constraint },
        });
      }
      reset();
    } catch (cause) {
      setRequestError(
        cause instanceof Error
          ? cause.message
          : "The constraint could not be saved. Your draft is preserved.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!deleteTarget) return;
    setSaving(true);
    setRequestError(null);
    try {
      await dispatchCommand({
        type: "constraint.remove",
        architectureId: architecture.id,
        constraintId: deleteTarget.id,
      });
      if (editingId === deleteTarget.id) reset();
      setDeleteTarget(null);
    } catch (cause) {
      setRequestError(
        cause instanceof Error
          ? cause.message
          : "The constraint could not be removed.",
      );
      setDeleteTarget(null);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className={styles.workspaceSection}>
        <div className={styles.sectionHeader}>
          <div>
            <h3>Constraints</h3>
            <p>Hard boundaries and scored operational preferences.</p>
          </div>
          <Button onClick={reset} size="compact" variant="secondary">
            Add
          </Button>
        </div>

        <div className={styles.patterns}>
          <strong>Operational preference patterns</strong>
          <div>
            {OPERATIONAL_PATTERNS.map((pattern) => (
              <button
                key={pattern.value}
                onClick={() => {
                  setEditingId(null);
                  setDraft({
                    statement: pattern.statement,
                    kind: "operational",
                    severity: "preference",
                    value: pattern.value,
                    source: "Editor pattern",
                  });
                  setErrors({});
                  setRequestError(null);
                }}
                type="button"
              >
                {pattern.label}
              </button>
            ))}
          </div>
        </div>

        <form className={styles.evidenceForm} onSubmit={save}>
          <h4>{editingId ? "Edit constraint" : "New constraint"}</h4>
          {requestError ? (
            <ErrorState
              action={
                <Button size="compact" type="submit" variant="secondary">
                  Retry
                </Button>
              }
              message={requestError}
              title="Constraint change failed"
            />
          ) : null}
          <TextArea
            error={errors.statement}
            label="Statement"
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                statement: event.target.value,
              }))
            }
            placeholder="Production data must remain in India."
            required
            value={draft.statement}
          />
          <div className={styles.fieldRow}>
            <Select
              error={errors.kind}
              label="Kind"
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  kind: event.target.value as ConstraintKind,
                }))
              }
              value={draft.kind}
            >
              {CONSTRAINT_KINDS.map((kind) => (
                <option key={kind} value={kind}>
                  {kind}
                </option>
              ))}
            </Select>
            <Select
              error={errors.severity}
              label="Behavior"
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  severity: event.target.value as ConstraintSeverity,
                }))
              }
              value={draft.severity}
            >
              {CONSTRAINT_SEVERITIES.map((severity) => (
                <option key={severity} value={severity}>
                  {severity === "hard" ? "Hard boundary" : "Preference"}
                </option>
              ))}
            </Select>
          </div>
          <Input
            error={errors.value}
            helperText="Use catalog IDs or comma-separated values when applicable."
            label="Structured value"
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                value: event.target.value,
              }))
            }
            placeholder="provider-aws, provider-azure"
            value={draft.value}
          />
          <Input
            error={errors.source}
            helperText="A stakeholder, decision record, or evidence URL."
            label="Evidence source"
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                source: event.target.value,
              }))
            }
            placeholder="ADR-004 or https://…"
            value={draft.source}
          />
          <div className={styles.formActions}>
            <Button busy={saving} type="submit">
              {editingId ? "Save constraint" : "Add constraint"}
            </Button>
            {editingId ? (
              <Button onClick={reset} variant="secondary">
                Cancel
              </Button>
            ) : null}
          </div>
        </form>

        {architecture.constraints.length === 0 ? (
          <EmptyState
            message="Add hard boundaries or preferences to make resolution evidence explicit."
            title="No constraints yet"
          />
        ) : (
          <ul className={styles.evidenceList}>
            {architecture.constraints.map((constraint) => (
              <li key={constraint.id}>
                <article className={styles.evidenceCard}>
                  <div className={styles.cardBadges}>
                    <Badge
                      tone={constraint.severity === "hard" ? "error" : "info"}
                    >
                      {constraint.severity === "hard"
                        ? "Hard boundary"
                        : "Preference"}
                    </Badge>
                    <Badge tone="neutral">{constraint.kind}</Badge>
                  </div>
                  <p>{constraint.statement}</p>
                  {constraint.value !== null ? (
                    <dl>
                      <dt>Value</dt>
                      <dd>
                        {Array.isArray(constraint.value)
                          ? constraint.value.join(", ")
                          : String(constraint.value)}
                      </dd>
                    </dl>
                  ) : null}
                  {constraint.source ? (
                    <div className={styles.source}>
                      <span>Evidence</span>
                      {isHttpSource(constraint.source) ? (
                        <a
                          href={constraint.source}
                          rel="noreferrer"
                          target="_blank"
                        >
                          {constraint.source}
                        </a>
                      ) : (
                        <strong>{constraint.source}</strong>
                      )}
                    </div>
                  ) : null}
                  <EvidenceIssueLinks
                    entityId={constraint.id}
                    issues={issues}
                    onInspectIssue={onInspectIssue}
                  />
                  <div className={styles.cardActions}>
                    <Button
                      onClick={() => {
                        setEditingId(constraint.id);
                        setDraft(constraintDraft(constraint));
                        setErrors({});
                        setRequestError(null);
                      }}
                      size="compact"
                      variant="ghost"
                    >
                      Edit
                    </Button>
                    <Button
                      onClick={() => setDeleteTarget(constraint)}
                      size="compact"
                      variant="ghost"
                    >
                      Delete
                    </Button>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        )}
      </div>
      <Dialog
        description="Removing this evidence may change resolver rankings and validation results."
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        open={deleteTarget !== null}
        title="Delete constraint?"
      >
        <p className={styles.confirmCopy}>{deleteTarget?.statement}</p>
        <div className={styles.dialogActions}>
          <Button onClick={() => setDeleteTarget(null)} variant="secondary">
            Cancel
          </Button>
          <Button busy={saving} onClick={() => void remove()} variant="danger">
            Delete constraint
          </Button>
        </div>
      </Dialog>
    </>
  );
}

export function RequirementsWorkspace(props: RequirementsWorkspaceProps) {
  return props.section === "requirements" ? (
    <RequirementEditor {...props} />
  ) : (
    <ConstraintEditor {...props} />
  );
}
