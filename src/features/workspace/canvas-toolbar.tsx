"use client";

import type { EditorTool } from "@/features/editor";
import styles from "./workspace.module.css";

interface CanvasToolbarProps {
  readonly activeTool: EditorTool;
  readonly onSelectTool: (tool: EditorTool) => void;
  readonly onOpenPrimitivePicker: () => void;
}

interface ToolItem {
  id: EditorTool;
  label: string;
  shortcut: string;
  icon: React.ReactNode;
}

const TOOLS: readonly ToolItem[] = [
  {
    id: "select",
    label: "Select",
    shortcut: "V",
    icon: (
      <svg fill="none" height="16" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="16">
        <path d="m3 3 7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
        <path d="m13 13 6 6" />
      </svg>
    ),
  },
  {
    id: "pan",
    label: "Hand / Pan",
    shortcut: "H",
    icon: (
      <svg fill="none" height="16" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="16">
        <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0" />
        <path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v6" />
        <path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8" />
        <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
      </svg>
    ),
  },
  {
    id: "arrow",
    label: "Connect Arrow",
    shortcut: "A",
    icon: (
      <svg fill="none" height="16" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="16">
        <path d="M5 12h14M12 5l7 7-7 7" />
      </svg>
    ),
  },
  {
    id: "capability-web-interface",
    label: "Client / Web",
    shortcut: "U",
    icon: (
      <svg fill="none" height="16" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="16">
        <rect height="16" rx="2" width="20" x="2" y="3" />
        <path d="M2 8h20M6 5.5h.01M9 5.5h.01" />
      </svg>
    ),
  },
  {
    id: "capability-api",
    label: "API Gateway",
    shortcut: "P",
    icon: (
      <svg fill="none" height="16" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="16">
        <path d="M4 8l4-4 4 4M8 4v16M20 16l-4 4-4-4M16 20V4" />
      </svg>
    ),
  },
  {
    id: "capability-compute",
    label: "Service / Compute",
    shortcut: "S",
    icon: (
      <svg fill="none" height="16" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="16">
        <rect height="12" rx="2" width="16" x="4" y="4" />
        <path d="M9 4v-2M15 4v-2M9 18v2M15 18v2M4 9H2M4 15H2M22 9h-2M22 15h-2" />
      </svg>
    ),
  },
  {
    id: "capability-database",
    label: "Database",
    shortcut: "D",
    icon: (
      <svg fill="none" height="16" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="16">
        <ellipse cx="12" cy="5" rx="9" ry="3" />
        <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
        <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
      </svg>
    ),
  },
  {
    id: "capability-cache",
    label: "Cache",
    shortcut: "C",
    icon: (
      <svg fill="none" height="16" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="16">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
  },
  {
    id: "capability-queue",
    label: "Queue / Stream",
    shortcut: "Q",
    icon: (
      <svg fill="none" height="16" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="16">
        <path d="M6 3v18M18 3v18M6 8h12M6 16h12" />
      </svg>
    ),
  },
  {
    id: "capability-object-storage",
    label: "Object Storage",
    shortcut: "O",
    icon: (
      <svg fill="none" height="16" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="16">
        <polyline points="21 8 21 21 3 21 3 8" />
        <rect height="5" width="22" x="1" y="3" />
        <line x1="10" x2="14" y1="12" y2="12" />
      </svg>
    ),
  },
];

export function CanvasToolbar({
  activeTool,
  onSelectTool,
  onOpenPrimitivePicker,
}: CanvasToolbarProps) {
  return (
    <nav aria-label="Canvas tools" className={styles.floatingToolbar}>
      {TOOLS.map((tool) => {
        const isActive = activeTool === tool.id;
        const isPrimitive = tool.id.startsWith("capability-");
        return (
          <button
            key={tool.id}
            aria-pressed={isActive}
            className={`${styles.toolbarToolBtn} ${isActive ? styles.toolbarToolBtnActive : ""}`}
            draggable={isPrimitive}
            onClick={() => onSelectTool(tool.id)}
            onDragStart={(e) => {
              if (isPrimitive) {
                e.dataTransfer.setData("application/archforge-capability", tool.id);
                e.dataTransfer.effectAllowed = "copy";
              }
            }}
            title={`${tool.label} (${tool.shortcut}) — Click or drag to canvas`}
            type="button"
          >
            {tool.icon}
            <span className={styles.srOnly}>{tool.label}</span>
          </button>
        );
      })}

      <div className={styles.toolbarDivider} />

      <button
        className={styles.toolbarToolBtn}
        onClick={onOpenPrimitivePicker}
        title="More system primitives (+)"
        type="button"
      >
        <svg fill="none" height="16" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="16">
          <line x1="12" x2="12" y1="5" y2="19" />
          <line x1="5" x2="19" y1="12" y2="12" />
        </svg>
        <span className={styles.srOnly}>More primitives</span>
      </button>
    </nav>
  );
}
