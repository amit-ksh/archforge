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
        message="Add at least two capabilities before defining a directed relationship."
        title="Connections need two components"
      />
    );
  }

  return (
    <div className={styles.connectionEditor}>
      {requestError ? (
        <ErrorState message={requestError} title="Connection change failed" />
      ) : null}
      <form className={styles.inspectorForm} onSubmit={save}>
        <div className={styles.formHeading}>
          <h3>{editingId ? "Edit connection" : "New connection"}</h3>
          <Badge tone="info">Directed</Badge>
        </div>
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
          helperText="Optional; use when the relationship is not obvious."
          label="Label"
          onChange={(event) =>
            setDraft((current) => ({ ...current, label: event.target.value }))
          }
          value={draft.label}
        />
        <div className={styles.formActions}>
          <Button busy={saving} type="submit">
            {editingId ? "Save connection" : "Connect components"}
          </Button>
          {editingId ? (
            <Button onClick={reset} variant="secondary">
              Cancel edit
            </Button>
          ) : null}
        </div>
      </form>

      <div className={styles.connectionListSection}>
        <h3>Saved connections</h3>
        {architecture.connections.length === 0 ? (
          <p className={styles.mutedCopy}>No relationships have been modeled yet.</p>
        ) : (
          <ul className={styles.connectionList}>
            {architecture.connections.map((connection) => {
              const source = architecture.components.find(
                ({ id }) => id === connection.sourceComponentId,
              );
              const target = architecture.components.find(
                ({ id }) => id === connection.targetComponentId,
              );
              return (
                <li key={connection.id}>
                  <div>
                    <strong>
                      {source?.name ?? connection.sourceComponentId} → {" "}
                      {target?.name ?? connection.targetComponentId}
                    </strong>
                    <span>
                      {connection.relationship}
                      {connection.label ? ` · ${connection.label}` : ""}
                    </span>
                  </div>
                  <div className={styles.compactActions}>
                    <Button
                      disabled={saving}
                      onClick={() => edit(connection)}
                      size="compact"
                      variant="ghost"
                    >
                      Edit
                    </Button>
                    <Button
                      disabled={saving}
                      onClick={() => void remove(connection.id)}
                      size="compact"
                      variant="ghost"
                    >
                      Remove
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
