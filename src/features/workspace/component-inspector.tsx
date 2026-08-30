"use client";

import { useMemo, useState, type FormEvent } from "react";

import type { ArchitectureCommand } from "@/application/commands";
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
import type { Architecture, Component, EntityId } from "@/domain/architecture";
import type { CapabilityDefinition } from "@/domain/catalog";

import {
  ComponentDraftSchema,
  fieldErrors,
  type ComponentDraft,
  type FieldErrors,
} from "./workspace-schemas";
import styles from "./workspace.module.css";

interface ComponentInspectorProps {
  readonly architecture: Architecture;
  readonly capabilities: readonly CapabilityDefinition[];
  readonly dispatchCommand: (command: ArchitectureCommand) => Promise<void>;
  readonly onDeleted: () => void;
  readonly selectedComponentId: EntityId | null;
}

const EMPTY_DRAFT: ComponentDraft = {
  capabilityId: "",
  name: "",
  description: "",
  existingInfrastructure: false,
};

function draftFor(component: Component | null): ComponentDraft {
  return component
    ? {
        capabilityId: component.capabilityId,
        name: component.name,
        description: component.description,
        existingInfrastructure: component.existingInfrastructure,
      }
    : EMPTY_DRAFT;
}

export function ComponentInspector({
  architecture,
  capabilities,
  dispatchCommand,
  onDeleted,
  selectedComponentId,
}: ComponentInspectorProps) {
  const selected = useMemo(
    () =>
      architecture.components.find(({ id }) => id === selectedComponentId) ??
      null,
    [architecture.components, selectedComponentId],
  );
  const [draft, setDraft] = useState<ComponentDraft>(() => draftFor(selected));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [requestError, setRequestError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (!selected) {
    return (
      <EmptyState
        message="Select a canvas node to inspect its semantic identity, position, and resolution state."
        title="No component selected"
      />
    );
  }
  const componentId = selected.id;

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = ComponentDraftSchema.safeParse(draft);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }

    setSaving(true);
    setErrors({});
    setRequestError(null);
    try {
      await dispatchCommand({
        type: "component.update",
        architectureId: architecture.id,
        componentId,
        patch: parsed.data,
      });
    } catch (cause) {
      setRequestError(
        cause instanceof Error
          ? cause.message
          : "The component could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    setSaving(true);
    setRequestError(null);
    try {
      await dispatchCommand({
        type: "component.remove",
        architectureId: architecture.id,
        componentId,
      });
      setDeleteOpen(false);
      onDeleted();
    } catch (cause) {
      setRequestError(
        cause instanceof Error
          ? cause.message
          : "The component could not be removed.",
      );
      setDeleteOpen(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <form className={styles.inspectorForm} onSubmit={save}>
        <div className={styles.inspectorIdentity}>
          <Badge tone="capability">Capability</Badge>
          {selected.existingInfrastructure ? (
            <Badge tone="existing">Existing infrastructure</Badge>
          ) : null}
        </div>
        {requestError ? (
          <ErrorState message={requestError} title="Change not saved" />
        ) : null}
        <Input
          error={errors.name}
          label="Component name"
          onChange={(event) =>
            setDraft((current) => ({ ...current, name: event.target.value }))
          }
          required
          value={draft.name}
        />
        <Select
          error={errors.capabilityId}
          label="Capability"
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              capabilityId: event.target.value,
            }))
          }
          required
          value={draft.capabilityId}
        >
          {capabilities.map((capability) => (
            <option key={capability.id} value={capability.id}>
              {capability.label}
            </option>
          ))}
        </Select>
        <TextArea
          error={errors.description}
          label="Description"
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              description: event.target.value,
            }))
          }
          value={draft.description}
        />
        <label className={styles.checkboxField}>
          <input
            checked={draft.existingInfrastructure}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                existingInfrastructure: event.target.checked,
              }))
            }
            type="checkbox"
          />
          <span>
            <strong>Existing infrastructure</strong>
            <small>Mark this capability as already present in the system.</small>
          </span>
        </label>
        <dl className={styles.technicalDetails}>
          <div>
            <dt>Position</dt>
            <dd>
              {Math.round(selected.position.x)}, {Math.round(selected.position.y)}
            </dd>
          </div>
          <div>
            <dt>Technology</dt>
            <dd>{selected.technologyId ?? "Unresolved"}</dd>
          </div>
          <div>
            <dt>Provider</dt>
            <dd>{selected.providerId ?? "Unresolved"}</dd>
          </div>
          <div>
            <dt>Cloud service</dt>
            <dd>{selected.cloudServiceId ?? "Unresolved"}</dd>
          </div>
        </dl>
        <div className={styles.formActions}>
          <Button busy={saving} type="submit">
            Save component
          </Button>
          <Button
            disabled={saving}
            onClick={() => setDeleteOpen(true)}
            variant="danger"
          >
            Remove
          </Button>
        </div>
      </form>

      <Dialog
        description="Connections attached to this component will also be removed."
        onOpenChange={setDeleteOpen}
        open={deleteOpen}
        title="Remove component?"
      >
        <div className={styles.dialogActions}>
          <Button onClick={() => setDeleteOpen(false)} variant="secondary">
            Cancel
          </Button>
          <Button busy={saving} onClick={() => void remove()} variant="danger">
            Remove component
          </Button>
        </div>
      </Dialog>
    </>
  );
}
