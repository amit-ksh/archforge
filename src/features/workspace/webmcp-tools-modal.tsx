"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useArchitectureWorkspace } from "@/app/architecture-provider";
import { Badge } from "@/components/ui";

import styles from "./workspace.module.css";

interface WebMcpToolsModalProps {
  readonly open: boolean;
  readonly onClose: () => void;
}

export function WebMcpToolsModal({ open, onClose }: WebMcpToolsModalProps) {
  const { webMcpTools } = useArchitectureWorkspace();
  const [search, setSearch] = useState("");
  const [prevOpen, setPrevOpen] = useState(open);
  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

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

  const filteredTools = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return webMcpTools;
    return webMcpTools.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q),
    );
  }, [webMcpTools, search]);

  if (!open) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.webmcpModal} ref={modalRef}>
        <div className={styles.webmcpModalHeader}>
          <div className={styles.webmcpTitleRow}>
            <div className={styles.webmcpIconWrap}>
              <svg fill="none" height="18" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="18">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
            </div>
            <div>
              <div className={styles.webmcpHeading}>WebMCP Protocol Tools</div>
              <p className={styles.webmcpSubheading}>
                Typed application services exposed to browser agents via WebMCP contracts.
              </p>
            </div>
          </div>
          <button
            aria-label="Close"
            className={styles.miniCloseBtn}
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>

        <div className={styles.webmcpSearchRow}>
          <svg fill="none" height="15" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="15">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" x2="16.65" y1="21" y2="16.65" />
          </svg>
          <input
            className={styles.webmcpSearchInput}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter supported WebMCP tools..."
            ref={inputRef}
            value={search}
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
            }}
          />
          <Badge tone="neutral">{filteredTools.length} tools</Badge>
        </div>

        <div className={styles.webmcpToolsList}>
          {filteredTools.length === 0 ? (
            <div className={styles.webmcpEmpty}>No WebMCP tools match &ldquo;{search}&rdquo;</div>
          ) : (
            filteredTools.map((tool) => (
              <div key={tool.name} className={styles.toolCard}>
                <div className={styles.toolCardHeader}>
                  <div className={styles.toolTitleGroup}>
                    <strong className={styles.toolTitle}>{tool.title}</strong>
                    <code className={styles.toolName}>{tool.name}</code>
                  </div>
                  <Badge tone={tool.behavior === "mutation" ? "warning" : "info"}>
                    {tool.behavior === "mutation" ? "Mutation" : "Read-only"}
                  </Badge>
                </div>
                <p className={styles.toolDescription}>{tool.description}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
