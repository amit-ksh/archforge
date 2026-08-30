"use client";

import type { ChangeEvent } from "react";

import { Badge, Button, Toolbar } from "@/components/ui";
import type { Architecture, EntityId } from "@/domain/architecture";

import styles from "./workspace.module.css";

interface ArchitectureToolbarProps {
  readonly architecture: Architecture;
  readonly architectures: readonly Architecture[];
  readonly loading: boolean;
  readonly narrow: boolean;
  readonly onClear: () => void;
  readonly onLoad: (id: EntityId) => Promise<void>;
  readonly onNew: () => void;
  readonly onOpenInspector: () => void;
  readonly onOpenInputs: () => void;
  readonly validationCount: number;
}

export function ArchitectureToolbar({
  architecture,
  architectures,
  loading,
  narrow,
  onClear,
  onLoad,
  onNew,
  onOpenInspector,
  onOpenInputs,
  validationCount,
}: ArchitectureToolbarProps) {
  function load(event: ChangeEvent<HTMLSelectElement>) {
    if (event.target.value !== architecture.id) {
      void onLoad(event.target.value);
    }
  }

  return (
    <Toolbar aria-label="Architecture commands" className={styles.commandBar}>
      <div className={styles.brand}>
        <span className={styles.brandMark} aria-hidden="true">
          AF
        </span>
        <div>
          <strong>ArchForge</strong>
          <span>Architecture workspace</span>
        </div>
      </div>
      <label className={styles.architecturePicker}>
        <span>Architecture</span>
        <select
          aria-label="Current architecture"
          disabled={loading}
          onChange={load}
          value={architecture.id}
        >
          {architectures.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      <Badge tone={validationCount > 0 ? "warning" : "success"}>
        {validationCount} {validationCount === 1 ? "issue" : "issues"}
      </Badge>
      <div className={styles.commandActions}>
        {narrow ? (
          <>
            <Button onClick={onOpenInputs} size="compact" variant="secondary">
              Inputs
            </Button>
            <Button onClick={onOpenInspector} size="compact" variant="secondary">
              Inspector
            </Button>
          </>
        ) : null}
        <Button onClick={onNew} size="compact" variant="secondary">
          New
        </Button>
        <Button onClick={onClear} size="compact" variant="ghost">
          Clear
        </Button>
      </div>
    </Toolbar>
  );
}
