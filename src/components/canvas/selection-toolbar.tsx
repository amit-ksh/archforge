"use client";

import { useEffect, useRef } from "react";
import type { Position } from "@/domain/architecture";
import type { EntityId } from "@/domain/architecture";
import type { TechnologyDefinition } from "@/domain/catalog";

import styles from "./canvas.module.css";

interface SelectionToolbarProps {
  readonly position: Position;
  readonly zoom: number;
  readonly technologyId: EntityId | null;
  readonly technologies: readonly TechnologyDefinition[];
  readonly onRename: () => void;
  readonly onStartConnect: () => void;
  readonly onSetTechnology: (technologyId: EntityId | null) => void;
  readonly onOpenInspector: () => void;
  readonly onDelete: () => void;
}

export function SelectionToolbar({
  position,
  zoom,
  technologyId,
  technologies,
  onRename,
  onStartConnect,
  onSetTechnology,
  onOpenInspector,
  onDelete,
}: SelectionToolbarProps) {
  const toolbarRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcut support while selected
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement
      ) {
        return;
      }
      if (event.key === "r" || event.key === "R") {
        event.preventDefault();
        onRename();
      } else if (event.key === "c" || event.key === "C") {
        if (!event.ctrlKey && !event.metaKey) {
          event.preventDefault();
          onStartConnect();
        }
      } else if (event.key === "i" || event.key === "I") {
        event.preventDefault();
        onOpenInspector();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onOpenInspector, onRename, onStartConnect]);

  // Position the toolbar above the node, accounting for zoom and node height
  const left = position.x;
  const top = position.y - 44 / zoom;

  return (
    <div
      className={styles.selectionToolbar}
      ref={toolbarRef}
      style={{
        left,
        top,
        transform: `scale(${1 / Math.max(0.6, Math.min(1.4, zoom))})`,
        transformOrigin: "bottom left",
      }}
      role="toolbar"
      aria-label="Component actions"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <button
        className={styles.miniToolBtn}
        onClick={onRename}
        title="Rename (R / Double click)"
        type="button"
      >
        <svg fill="none" height="14" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="14">
          <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
        </svg>
        <span>Rename</span>
      </button>

      <label className={styles.quickTechnologyField}>
        <span>Tech</span>
        <select
          aria-label="Technology"
          className={styles.quickTechnologySelect}
          onChange={(event) => onSetTechnology(event.target.value || null)}
          onPointerDown={(event) => event.stopPropagation()}
          title="Change technology"
          value={technologyId ?? ""}
        >
          <option value="">Provider-neutral</option>
          {technologies.map((technology) => (
            <option key={technology.id} value={technology.id}>
              {technology.label}
            </option>
          ))}
        </select>
      </label>

      <button
        className={styles.miniToolBtn}
        onClick={onStartConnect}
        title="Connect to another component (C)"
        type="button"
      >
        <svg fill="none" height="14" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="14">
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
        <span>Connect</span>
      </button>

      <button
        className={styles.miniToolBtn}
        onClick={onOpenInspector}
        title="Inspect details and resolve technology (I)"
        type="button"
      >
        <svg fill="none" height="14" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="14">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4M12 8h.01" />
        </svg>
        <span>Inspect</span>
      </button>

      <button
        className={`${styles.miniToolBtn} ${styles.miniToolBtnDanger}`}
        onClick={onDelete}
        title="Delete component (Delete / Backspace)"
        type="button"
      >
        <svg fill="none" height="14" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="14">
          <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
      </button>
    </div>
  );
}
