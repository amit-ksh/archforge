"use client";

import { useEffect, useRef } from "react";
import styles from "./workspace.module.css";

interface ShortcutsModalProps {
  readonly open: boolean;
  readonly onClose: () => void;
}

interface ShortcutItem {
  keys: readonly string[];
  description: string;
}

interface ShortcutCategory {
  category: string;
  items: readonly ShortcutItem[];
}

const SHORTCUT_GROUPS: readonly ShortcutCategory[] = [
  {
    category: "Tools & Creation",
    items: [
      { keys: ["V"], description: "Select tool" },
      { keys: ["H", "Space + Drag"], description: "Hand / Pan canvas" },
      { keys: ["A", "L"], description: "Connect Arrow tool" },
      { keys: ["U"], description: "Client / Web primitive" },
      { keys: ["P"], description: "API Gateway primitive" },
      { keys: ["S"], description: "Service / Compute primitive" },
      { keys: ["D"], description: "Database primitive" },
      { keys: ["C"], description: "Cache primitive" },
      { keys: ["Q"], description: "Queue / Stream primitive" },
      { keys: ["O"], description: "Object Storage primitive" },
    ],
  },
  {
    category: "Selection & Manipulation",
    items: [
      { keys: ["Ctrl", "A"], description: "Select all components" },
      { keys: ["Shift + Click"], description: "Toggle multi-selection" },
      { keys: ["Ctrl", "D"], description: "Duplicate selected component" },
      { keys: ["Delete", "Backspace"], description: "Delete selected component or connection" },
      { keys: ["Arrow keys"], description: "Nudge selected component (8px)" },
      { keys: ["Shift + Arrows"], description: "Fast nudge selected component (32px)" },
      { keys: ["Double Click"], description: "Inline rename node or connection label" },
    ],
  },
  {
    category: "Navigation & Viewport",
    items: [
      { keys: ["+", "="], description: "Zoom in" },
      { keys: ["-"], description: "Zoom out" },
      { keys: ["0"], description: "Reset zoom & center" },
      { keys: ["I"], description: "Toggle Inspector drawer" },
      { keys: ["?"], description: "Open Keyboard Shortcuts guide" },
      { keys: ["Esc"], description: "Clear selection / close modal" },
    ],
  },
];

export function ShortcutsModal({ open, onClose }: ShortcutsModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.shortcutsModal} ref={modalRef}>
        <div className={styles.webmcpModalHeader}>
          <div className={styles.webmcpHeading}>Keyboard Shortcuts</div>
          <button
            aria-label="Close"
            className={styles.miniCloseBtn}
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>

        <div className={styles.shortcutsContent}>
          {SHORTCUT_GROUPS.map((group) => (
            <div key={group.category} className={styles.shortcutsGroup}>
              <div className={styles.shortcutsCategoryTitle}>{group.category}</div>
              <div className={styles.shortcutsList}>
                {group.items.map((item) => (
                  <div key={item.description} className={styles.shortcutRow}>
                    <span className={styles.shortcutDesc}>{item.description}</span>
                    <div className={styles.shortcutKeys}>
                      {item.keys.map((k) => (
                        <kbd key={k} className={styles.kbd}>
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
