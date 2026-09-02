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
import type { CapabilityDefinition, TechnologyDefinition } from "@/domain/catalog";

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
  readonly technologies: readonly TechnologyDefinition[];
  readonly dispatchCommand: (command: ArchitectureCommand) => Promise<void>;
  readonly onDeleted: () => void;
  readonly onSwitchTab?: (tab: "component" | "resolution" | "connections" | "evidence") => void;
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
  technologies,
  dispatchCommand,
  onDeleted,
  onSwitchTab,
  selectedComponentId,
}: ComponentInspectorProps) {
  const selected = useMemo(
    () =>
      architecture.components.find(({ id }) => id === selectedComponentId) ??
      null,
    [architecture.components, selectedComponentId],
  );
  const [draft, setDraft] = useState<ComponentDraft>(() => draftFor(selected));
  const [prevSelectedId, setPrevSelectedId] = useState<EntityId | null>(selectedComponentId);

  if (selectedComponentId !== prevSelectedId) {
    setPrevSelectedId(selectedComponentId);
    setDraft(draftFor(selected));
  }

  const [errors, setErrors] = useState<FieldErrors>({});
  const [requestError, setRequestError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [changingTech, setChangingTech] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (!selected) {
    return (
      <EmptyState
        message="Select a node on the canvas to inspect or edit its properties and technology."
        title="No component selected"
      />
    );
  }
  const componentId = selected.id;
  const compatibleTechnologies = technologies.filter((technology) =>
    technology.capabilityIds.includes(selected.capabilityId),
  );

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

  async function handleTechnologyChange(newTechId: string) {
    setChangingTech(true);
    setRequestError(null);
    try {
      await dispatchCommand({
        type: "resolution.set-technology",
        architectureId: architecture.id,
        componentId,
        technologyId: newTechId ? newTechId : null,
      });
    } catch (cause) {
      setRequestError(
        cause instanceof Error
          ? cause.message
          : "Failed to update technology choice.",
      );
    } finally {
      setChangingTech(false);
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
    <div className={styles.inspectorBody}>
      <form className={styles.inspectorForm} onSubmit={save}>
        <div className={styles.inspectorIdentity}>
          <Badge tone="capability">{selected.capabilityId}</Badge>
          {selected.existingInfrastructure ? (
            <Badge tone="neutral">Existing Infra</Badge>
          ) : (
            <Badge tone="info">New Component</Badge>
          )}
        </div>

        {requestError ? (
          <ErrorState message={requestError} title="Change not saved" />
        ) : null}

        <Input
          className={styles.inspectorFieldControl}
          error={errors.name}
          label="Component name"
          onChange={(event) =>
            setDraft((current) => ({ ...current, name: event.target.value }))
          }
          required
          value={draft.name}
        />

        <Select
          className={styles.inspectorFieldControl}
          error={errors.capabilityId}
          label="Capability role"
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

        <div className={styles.techSection}>
          <div className={styles.techHeader}>
            <label className={styles.fieldLabel}>Assigned Technology</label>
            {onSwitchTab ? (
              <button
                className={styles.linkButton}
                onClick={() => onSwitchTab("resolution")}
                type="button"
              >
                Compare scored evidence →
              </button>
            ) : null}
          </div>
          <select
            aria-label="Assigned Technology"
            className={styles.modernSelect}
            disabled={changingTech}
            onChange={(e) => void handleTechnologyChange(e.target.value)}
            value={selected.technologyId ?? ""}
          >
            <option value="">Provider-neutral (Unresolved)</option>
            {compatibleTechnologies.map((technology) => (
              <option key={technology.id} value={technology.id}>
                {technology.label}
              </option>
            ))}
          </select>
        </div>

        <TextArea
          className={`${styles.inspectorFieldControl} ${styles.inspectorDescription}`}
          error={errors.description}
          label="Description"
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              description: event.target.value,
            }))
          }
          placeholder="System role, responsibilities, or domain boundaries..."
          value={draft.description}
        />

        <label className={styles.checkboxCard}>
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
          <div>
            <strong>Existing Infrastructure</strong>
            <span>Preserve as pre-existing legacy/shared component</span>
          </div>
        </label>

        <div className={styles.metaCard}>
          <div className={styles.metaRow}>
            <span>Position</span>
            <code>{Math.round(selected.position.x)}, {Math.round(selected.position.y)}</code>
          </div>
          <div className={styles.metaRow}>
            <span>Provider</span>
            <code>{selected.providerId ?? "Provider-neutral"}</code>
          </div>
          <div className={styles.metaRow}>
            <span>Cloud Service</span>
            <code>{selected.cloudServiceId ?? "Provider-neutral"}</code>
          </div>
        </div>

        <div className={styles.inspectorActionsRow}>
          <Button busy={saving} size="compact" type="submit">
            Save changes
          </Button>
          <Button
            disabled={saving}
            onClick={() => setDeleteOpen(true)}
            size="compact"
            variant="danger"
          >
            Delete
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
    </div>
  );
}
