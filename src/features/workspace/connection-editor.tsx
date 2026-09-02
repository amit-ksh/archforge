"use client";

import { useState, type FormEvent } from "react";

import type { ArchitectureCommand } from "@/application/commands";
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  Input,
  Select,
} from "@/components/ui";
import type {
  Architecture,
  Connection,
  ConnectionRelationship,
} from "@/domain/architecture";

import {
  ConnectionDraftSchema,
  fieldErrors,
  type ConnectionDraft,
  type FieldErrors,
} from "./workspace-schemas";
import styles from "./workspace.module.css";

interface ConnectionEditorProps {
  readonly architecture: Architecture;
  readonly dispatchCommand: (command: ArchitectureCommand) => Promise<void>;
  readonly nextId: (prefix: string) => string;
}

const RELATIONSHIPS: readonly ConnectionRelationship[] = [
  "request",
  "data",
  "event",
  "dependency",
  "control",
  "other",
];

const EMPTY_DRAFT: ConnectionDraft = {
  sourceComponentId: "",
  targetComponentId: "",
  relationship: "request",
  label: "",
};

function draftFor(connection: Connection | null): ConnectionDraft {
  return connection
    ? {
        sourceComponentId: connection.sourceComponentId,
        targetComponentId: connection.targetComponentId,
        relationship: connection.relationship,
        label: connection.label,
      }
    : EMPTY_DRAFT;
}

export function ConnectionEditor({
  architecture,
  dispatchCommand,
  nextId,
}: ConnectionEditorProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ConnectionDraft>(EMPTY_DRAFT);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [requestError, setRequestError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function edit(connection: Connection) {
    setEditingId(connection.id);
    setDraft(draftFor(connection));
    setErrors({});
    setRequestError(null);
  }

  function reset() {
    setEditingId(null);
    setDraft(EMPTY_DRAFT);
    setErrors({});
    setRequestError(null);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = ConnectionDraftSchema.safeParse(draft);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }

    setSaving(true);
    setErrors({});
    setRequestError(null);
    try {
      if (editingId) {
        await dispatchCommand({
          type: "connection.update",
          architectureId: architecture.id,
          connectionId: editingId,
          patch: parsed.data,
        });
      } else {
        await dispatchCommand({
          type: "connection.connect",
          architectureId: architecture.id,
          connection: { id: nextId("connection"), ...parsed.data },
        });
      }
      reset();
    } catch (cause) {
      setRequestError(
        cause instanceof Error
          ? cause.message
          : "The connection could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function remove(connectionId: string) {
    setSaving(true);
    setRequestError(null);
    try {
      await dispatchCommand({
        type: "connection.remove",
        architectureId: architecture.id,
        connectionId,
      });
      if (editingId === connectionId) reset();
    } catch (cause) {
      setRequestError(
        cause instanceof Error
          ? cause.message
          : "The connection could not be removed.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (architecture.components.length < 2) {
    return (
      <EmptyState
        message="Add at least two capabilities on the canvas before connecting them."
        title="Connections need two components"
      />
    );
  }

  return (
    <div className={styles.inspectorBody}>
      {requestError ? (
        <ErrorState message={requestError} title="Connection change failed" />
      ) : null}

      {/* Connection Form Card */}
      <div className={styles.panelSectionCard}>
        <div className={styles.sectionHeaderRow}>
          <h4>{editingId ? "Edit connection" : "Add connection"}</h4>
          <Badge tone="info">Directed</Badge>
        </div>

        <form className={styles.inspectorForm} onSubmit={save}>
          <div className={styles.formGrid2}>
            <Select
              error={errors.sourceComponentId}
              label="Source"
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  sourceComponentId: event.target.value,
                }))
              }
              required
              value={draft.sourceComponentId}
            >
              <option value="">Choose source</option>
              {architecture.components.map((component) => (
                <option key={component.id} value={component.id}>
                  {component.name}
                </option>
              ))}
            </Select>

            <Select
              error={errors.targetComponentId}
              label="Target"
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  targetComponentId: event.target.value,
                }))
              }
              required
              value={draft.targetComponentId}
            >
              <option value="">Choose target</option>
              {architecture.components.map((component) => (
                <option key={component.id} value={component.id}>
                  {component.name}
                </option>
              ))}
            </Select>
          </div>

          <div className={styles.formGrid2}>
            <Select
              label="Relationship"
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  relationship: event.target.value as ConnectionRelationship,
                }))
              }
              value={draft.relationship}
            >
              {RELATIONSHIPS.map((relationship) => (
                <option key={relationship} value={relationship}>
                  {relationship}
                </option>
              ))}
            </Select>

            <Input
              error={errors.label}
              label="Protocol / Label"
              onChange={(event) =>
                setDraft((current) => ({ ...current, label: event.target.value }))
              }
              placeholder="e.g. gRPC, HTTPS, Event"
              value={draft.label}
            />
          </div>

          <div className={styles.inspectorActionsRow}>
            <Button busy={saving} size="compact" type="submit">
              {editingId ? "Update Connection" : "Connect Components"}
            </Button>
            {editingId ? (
              <Button onClick={reset} size="compact" variant="secondary">
                Cancel
              </Button>
            ) : null}
          </div>
        </form>
      </div>

      {/* Saved Connections List */}
      <div className={styles.connectionListSection}>
        <div className={styles.sectionHeaderRow}>
          <h4>Saved Connections ({architecture.connections.length})</h4>
        </div>

        {architecture.connections.length === 0 ? (
          <p className={styles.emptyNotice}>No relationships modeled yet. Use the form above or connect directly on canvas.</p>
        ) : (
          <div className={styles.cardsList}>
            {architecture.connections.map((connection) => {
              const source = architecture.components.find(
                ({ id }) => id === connection.sourceComponentId,
              );
              const target = architecture.components.find(
                ({ id }) => id === connection.targetComponentId,
              );
              return (
                <div className={styles.connectionCard} key={connection.id}>
                  <div className={styles.connectionCardMain}>
                    <div className={styles.connectionCardRoute}>
                      <span className={styles.compNodeName}>{source?.name ?? "Unknown"}</span>
                      <span className={styles.arrowIcon}>→</span>
                      <span className={styles.compNodeName}>{target?.name ?? "Unknown"}</span>
                    </div>
                    <div className={styles.connectionCardMeta}>
                      <span className={styles.relationshipBadge}>{connection.relationship}</span>
                      {connection.label ? (
                        <span className={styles.connectionLabelBadge}>{connection.label}</span>
                      ) : null}
                    </div>
                  </div>

                  <div className={styles.cardActions}>
                    <button
                      className={styles.cardIconBtn}
                      disabled={saving}
                      onClick={() => edit(connection)}
                      title="Edit connection"
                      type="button"
                    >
                      <svg fill="none" height="13" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="13">
                        <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                      </svg>
                    </button>
                    <button
                      className={`${styles.cardIconBtn} ${styles.cardIconBtnDanger}`}
                      disabled={saving}
                      onClick={() => void remove(connection.id)}
                      title="Remove connection"
                      type="button"
                    >
                      <svg fill="none" height="13" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="13">
                        <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
