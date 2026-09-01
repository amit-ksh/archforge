"use client";

import { useEffect, useRef, useState } from "react";
import type { ExportFormat } from "@/application/contracts";

import styles from "./workspace.module.css";

interface ExportPopoverProps {
  readonly open: boolean;
  readonly exporting: boolean;
  readonly onClose: () => void;
  readonly onExport: (format: ExportFormat) => Promise<void>;
}

export function ExportPopover({
  open,
  exporting,
  onClose,
  onExport,
}: ExportPopoverProps) {
  const [format, setFormat] = useState<ExportFormat>("png");
  const [scale, setScale] = useState<"1x" | "2x" | "4x">("2x");
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node)
      ) {
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
    <div className={styles.exportPopoverOverlay}>
      <div className={styles.exportPopover} ref={popoverRef}>
        <div className={styles.exportPopoverHeader}>
          <h3>Export Architecture</h3>
          <button className={styles.miniCloseBtn} onClick={onClose} type="button">
            ×
          </button>
        </div>

        <div className={styles.exportOptions}>
          <label className={styles.exportOptionGroup}>
            <span>Format</span>
            <div className={styles.formatPills}>
              {(["png", "svg", "json"] as const).map((f) => (
                <button
                  key={f}
                  className={`${styles.formatPill} ${format === f ? styles.formatPillActive : ""}`}
                  onClick={() => setFormat(f)}
                  type="button"
                >
                  {f.toUpperCase()}
                </button>
              ))}
            </div>
          </label>

          {format === "png" ? (
            <label className={styles.exportOptionGroup}>
              <span>Resolution Scale</span>
              <div className={styles.formatPills}>
                {(["1x", "2x", "4x"] as const).map((s) => (
                  <button
                    key={s}
                    className={`${styles.formatPill} ${scale === s ? styles.formatPillActive : ""}`}
                    onClick={() => setScale(s)}
                    type="button"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </label>
          ) : null}
        </div>

        <div className={styles.exportActions}>
          <button
            className={styles.exportDownloadBtn}
            disabled={exporting}
            onClick={() => void onExport(format)}
            type="button"
          >
            {exporting ? "Generating..." : `Export as ${format.toUpperCase()}`}
          </button>
        </div>
      </div>
    </div>
  );
}
