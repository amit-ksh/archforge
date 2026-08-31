"use client";

import { useState, type FormEvent } from "react";

import { Button, ErrorState, Input, TextArea } from "@/components/ui";

import {
  ArchitectureDraftSchema,
  fieldErrors,
  type ArchitectureDraft,
  type FieldErrors,
} from "./workspace-schemas";
import styles from "./workspace.module.css";

interface CreateArchitectureFormProps {
  readonly onCancel?: () => void;
  readonly onCreate: (name: string, description?: string) => Promise<void>;
}

const INITIAL_DRAFT: ArchitectureDraft = { name: "", description: "" };

export function CreateArchitectureForm({
  onCancel,
  onCreate,
}: CreateArchitectureFormProps) {
  const [draft, setDraft] = useState<ArchitectureDraft>(INITIAL_DRAFT);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [requestError, setRequestError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = ArchitectureDraftSchema.safeParse(draft);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }

    setSaving(true);
    setErrors({});
    setRequestError(null);
    try {
      await onCreate(parsed.data.name, parsed.data.description || undefined);
      setDraft(INITIAL_DRAFT);
    } catch (cause) {
      setRequestError(
        cause instanceof Error
          ? cause.message
          : "The architecture could not be created.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className={styles.inspectorForm} onSubmit={submit}>
      {requestError ? (
        <ErrorState message={requestError} title="Architecture not created" />
      ) : null}
      <Input
        error={errors.name}
        label="Architecture name"
        onChange={(event) =>
          setDraft((current) => ({ ...current, name: event.target.value }))
        }
        placeholder="Customer platform"
        required
        value={draft.name}
      />
      <TextArea
        error={errors.description}
        label="Description"
        onChange={(event) =>
          setDraft((current) => ({
            ...current,
            description: event.target.value,
          }))
        }
        placeholder="What system are you designing?"
        value={draft.description}
      />
      <div className={styles.formActions}>
        <Button busy={saving} type="submit">
          Create architecture
        </Button>
        {onCancel ? (
          <Button disabled={saving} onClick={onCancel} variant="secondary">
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}
