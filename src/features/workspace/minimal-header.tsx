"use client";

import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import type { Architecture, EntityId } from "@/domain/architecture";
import { BrandMark } from "@/components/ui";

import styles from "./workspace.module.css";

interface MinimalHeaderProps {
  readonly architecture: Architecture;
  readonly architectures: readonly Architecture[];
  readonly inspectorOpen: boolean;
  readonly onOpenWebMcp: () => void;
  readonly onOpenShortcuts: () => void;
  readonly onToggleInspector: () => void;
  readonly onOpenExport: () => void;
  readonly onNewArchitecture: () => void;
  readonly onClearArchitecture: () => void;
  readonly onLoadArchitecture: (id: EntityId) => Promise<void>;
  readonly onRenameArchitecture: (name: string) => Promise<void>;
}

export function MinimalHeader({
  architecture,
  architectures,
  inspectorOpen,
  onOpenWebMcp,
  onOpenShortcuts,
  onToggleInspector,
  onOpenExport,
  onNewArchitecture,
  onClearArchitecture,
  onLoadArchitecture,
  onRenameArchitecture,
}: MinimalHeaderProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [prevName, setPrevName] = useState(architecture.name);
  const [nameDraft, setNameDraft] = useState(architecture.name);

  if (architecture.name !== prevName) {
    setPrevName(architecture.name);
    setNameDraft(architecture.name);
  }

  const [menuOpen, setMenuOpen] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isEditingName) {
      nameInputRef.current?.focus();
      nameInputRef.current?.select();
    }
  }, [isEditingName]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleNameBlur() {
    if (nameDraft.trim() && nameDraft !== architecture.name) {
      void onRenameArchitecture(nameDraft.trim());
    }
    setIsEditingName(false);
  }

  function handleNameKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleNameBlur();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setNameDraft(architecture.name);
      setIsEditingName(false);
    }
  }

  return (
    <header className={styles.minimalHeader} aria-label="Main Navigation">
      {/* Left section: Brand + Architecture Title + Switcher */}
      <div className={styles.headerLeft}>
        <div className={styles.headerBrand}>
          <BrandMark size={22} />
          <span className={styles.brandName}>ArchForge</span>
        </div>

        <div className={styles.headerDivider} />

        <div className={styles.headerTitleContainer}>
          {isEditingName ? (
            <input
              autoFocus
              className={styles.headerNameInput}
              onBlur={handleNameBlur}
              onChange={(e) => setNameDraft(e.target.value)}
              onKeyDown={handleNameKeyDown}
              ref={nameInputRef}
              value={nameDraft}
              placeholder="System name..."
            />
          ) : (
            <button
              className={styles.headerNameBtn}
              onClick={() => setIsEditingName(true)}
              title="Click to rename system"
              type="button"
            >
              <span className={styles.headerNameText}>{architecture.name}</span>
              <svg fill="none" height="12" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="12">
                <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
            </button>
          )}
        </div>

        {/* Architecture Switcher */}
        {architectures.length > 1 ? (
          <select
            aria-label="Switch system"
            className={styles.headerArchSelect}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => void onLoadArchitecture(e.target.value)}
            value={architecture.id}
          >
            {architectures.map((arch) => (
              <option key={arch.id} value={arch.id}>
                {arch.name}
              </option>
            ))}
          </select>
        ) : null}

        <span className={styles.headerRevisionBadge} title="Current revision saved locally in IndexedDB">
          r{architecture.revision}
        </span>
      </div>

      {/* Right section: WebMCP, Shortcuts, Inspector, Export */}
      <div className={styles.headerRight}>
        {/* WebMCP Tools Modal Trigger */}
        <button
          className={styles.headerWebMcpBtn}
          onClick={onOpenWebMcp}
          title="View supported WebMCP protocol tools"
          type="button"
        >
          <svg fill="none" height="13" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="13">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          </svg>
          <span>WebMCP Tools</span>
        </button>

        {/* Shortcuts Help Trigger */}
        <button
          className={styles.headerIconBtn}
          onClick={onOpenShortcuts}
          title="Keyboard shortcuts (?)"
          type="button"
        >
          <svg fill="none" height="14" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="14">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <line x1="12" x2="12.01" y1="17" y2="17" />
          </svg>
        </button>

        {/* Inspector Toggle */}
        <button
          className={`${styles.headerNavBtn} ${inspectorOpen ? styles.headerNavBtnActive : ""}`}
          onClick={onToggleInspector}
          title="Toggle Inspector drawer (I)"
          type="button"
        >
          <svg fill="none" height="14" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="14">
            <rect height="18" rx="2" width="18" x="3" y="3" />
            <line x1="15" x2="15" y1="3" y2="21" />
          </svg>
          <span>Inspector</span>
        </button>

        {/* Export Button */}
        <button
          className={styles.headerExportBtn}
          onClick={onOpenExport}
          title="Export as PNG, SVG, or JSON"
          type="button"
        >
          <svg fill="none" height="14" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="14">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
          </svg>
          <span>Export</span>
        </button>

        {/* Actions Dropdown */}
        <div className={styles.headerDropdownWrap} ref={menuRef}>
          <button
            aria-label="More actions"
            className={styles.headerIconBtn}
            onClick={() => setMenuOpen(!menuOpen)}
            type="button"
          >
            <svg fill="none" height="16" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="16">
              <circle cx="12" cy="12" r="1" />
              <circle cx="12" cy="5" r="1" />
              <circle cx="12" cy="19" r="1" />
            </svg>
          </button>

          {menuOpen ? (
            <div className={`${styles.headerDropdownMenu} ${styles.headerDropdownMenuRight}`}>
              <button
                className={styles.dropdownMenuItemSimple}
                onClick={() => {
                  setMenuOpen(false);
                  onNewArchitecture();
                }}
                type="button"
              >
                New System
              </button>
              <button
                className={`${styles.dropdownMenuItemSimple} ${styles.dropdownMenuItemDanger}`}
                onClick={() => {
                  setMenuOpen(false);
                  onClearArchitecture();
                }}
                type="button"
              >
                Clear Canvas
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
