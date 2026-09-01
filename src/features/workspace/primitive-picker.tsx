"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CapabilityDefinition } from "@/domain/catalog";

import styles from "./workspace.module.css";

interface PrimitivePickerProps {
  readonly capabilities: readonly CapabilityDefinition[];
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onSelectCapability: (capabilityId: string) => void;
}

const CATEGORY_NAMES: Record<string, string> = {
  interface: "Interface & Edge",
  compute: "Compute & Execution",
  data: "Data & Storage",
  messaging: "Messaging & Events",
  storage: "Object & Blobs",
  security: "Security & Identity",
  observability: "Telemetry & Logs",
  networking: "Networking & Mesh",
};

const LEGACY_CAPABILITY_IDS = new Set([
  "capability-relational-database",
  "capability-document-database",
]);

export function PrimitivePicker({
  capabilities,
  open,
  onClose,
  onSelectCapability,
}: PrimitivePickerProps) {
  const [prevOpen, setPrevOpen] = useState(open);
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  if (open && !prevOpen) {
    setPrevOpen(true);
    setSearch("");
  } else if (!open && prevOpen) {
    setPrevOpen(false);
  }

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open, onClose]);

  const filtered = useMemo(() => {
    const query = search.toLowerCase().trim();
    return capabilities.filter(
      (c) =>
        !LEGACY_CAPABILITY_IDS.has(c.id) &&
        (!query ||
          c.label.toLowerCase().includes(query) ||
          c.description.toLowerCase().includes(query) ||
          c.category.toLowerCase().includes(query)),
    );
  }, [capabilities, search]);

  const grouped = useMemo(() => {
    const map = new Map<string, CapabilityDefinition[]>();
    for (const item of filtered) {
      const list = map.get(item.category) ?? [];
      list.push(item);
      map.set(item.category, list);
    }
    return [...map.entries()];
  }, [filtered]);

  if (!open) return null;

  return (
    <section
      aria-label="System primitives"
      className={styles.pickerPopover}
      ref={containerRef}
    >
        <div className={styles.pickerHeader}>
          <svg fill="none" height="16" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="16">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" x2="16.65" y1="21" y2="16.65" />
          </svg>
          <input
            className={styles.pickerSearchInput}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search system primitives... (e.g. database, queue, cache)"
            ref={inputRef}
            value={search}
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
            }}
          />
          <button className={styles.pickerCloseBtn} onClick={onClose} type="button">
            Esc
          </button>
        </div>

        <div className={styles.pickerContent}>
          {grouped.length === 0 ? (
            <div className={styles.pickerEmpty}>No architecture primitives match &ldquo;{search}&rdquo;</div>
          ) : (
            grouped.map(([category, items]) => (
              <div key={category} className={styles.pickerGroup}>
                <div className={styles.pickerCategoryTitle}>
                  {CATEGORY_NAMES[category] ?? category}
                </div>
                <div className={styles.pickerGrid}>
                  {items.map((item) => (
                    <button
                      key={item.id}
                      className={styles.pickerCard}
                      draggable={true}
                      onClick={() => {
                        onSelectCapability(item.id);
                        onClose();
                      }}
                      onDragStart={(e) => {
                        e.dataTransfer.setData("application/archforge-capability", item.id);
                        e.dataTransfer.effectAllowed = "copy";
                      }}
                      type="button"
                    >
                      <div className={styles.pickerCardHeader}>
                        <strong>{item.label}</strong>
                        <code>{item.id.replace("capability-", "")}</code>
                      </div>
                      <p>{item.description}</p>
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
    </section>
  );
}
