"use client";

import { useState } from "react";

import { Badge, Button, ErrorState } from "@/components/ui";
import type { CapabilityDefinition } from "@/domain/catalog";

import styles from "./workspace.module.css";

interface ComponentLibraryProps {
  readonly capabilities: readonly CapabilityDefinition[];
  readonly onAdd: (capability: CapabilityDefinition) => Promise<void>;
}

export function ComponentLibrary({
  capabilities,
  onAdd,
}: ComponentLibraryProps) {
  const [addingId, setAddingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function add(capability: CapabilityDefinition) {
    setAddingId(capability.id);
    setError(null);
    try {
      await onAdd(capability);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "The capability could not be added.",
      );
    } finally {
      setAddingId(null);
    }
  }

  return (
    <div className={styles.libraryContent}>
      <div className={styles.sectionIntro}>
        <p>
          Add provider-neutral capabilities. Technology choices remain separate.
        </p>
      </div>
      {error ? (
        <ErrorState
          message={error}
          title="Capability not added"
        />
      ) : null}
      <ul className={styles.libraryList}>
        {capabilities.map((capability) => (
          <li key={capability.id}>
            <article className={styles.libraryItem}>
              <div className={styles.libraryItemHeader}>
                <Badge tone="capability">{capability.category}</Badge>
                <span className={styles.libraryIcon} aria-hidden="true">
                  {capability.iconKey.slice(0, 2).toUpperCase()}
                </span>
              </div>
              <div>
                <h3>{capability.label}</h3>
                <p>{capability.description}</p>
              </div>
              <Button
                busy={addingId === capability.id}
                disabled={addingId !== null && addingId !== capability.id}
                onClick={() => void add(capability)}
                size="compact"
                variant="secondary"
              >
                Add to canvas
              </Button>
            </article>
          </li>
        ))}
      </ul>
    </div>
  );
}
