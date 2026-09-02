"use client";

import { useState, type FormEvent } from "react";

import { Button, ErrorState, Input } from "@/components/ui";

import {
  ArchitectureDraftSchema,
  fieldErrors,
  type ArchitectureDraft,
  type FieldErrors,
} from "./workspace-schemas";
import styles from "./workspace.module.css";

interface CreateArchitectureFormProps {
  readonly className?: string;
  readonly inputLabel?: string;
  readonly onCancel?: () => void;
  readonly onCreate: (name: string) => Promise<void>;
  readonly placeholder?: string;
  readonly submitLabel?: string;
  readonly submitSize?: "default" | "compact";
}

const INITIAL_DRAFT: ArchitectureDraft = { name: "" };

export function CreateArchitectureForm({
  className,
  inputLabel = "System Name",
  onCancel,
  onCreate,
  placeholder = "e.g. Distributed Payment Gateway",
  submitLabel = "Create",
  submitSize = "default",
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
      await onCreate(parsed.data.name);
      setDraft(INITIAL_DRAFT);
    } catch (cause) {
      setRequestError(
        cause instanceof Error
          ? cause.message
          : "The system could not be created.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className={[styles.inspectorForm, className].filter(Boolean).join(" ")} onSubmit={submit}>
      {requestError ? (
        <ErrorState message={requestError} title="System not created" />
      ) : null}
      <Input
        error={errors.name}
        label={inputLabel}
        onChange={(event) =>
          setDraft((current) => ({ ...current, name: event.target.value }))
        }
        placeholder={placeholder}
        required
        value={draft.name}
      />
      <div className={styles.formActions}>
        <Button busy={saving} size={submitSize} type="submit">
          {submitLabel}
        </Button>
        {onCancel ? (
          <Button disabled={saving} onClick={onCancel} size={submitSize} variant="secondary">
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}
