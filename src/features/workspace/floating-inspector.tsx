"use client";

import { useState } from "react";
import { useArchitectureWorkspace } from "@/app/architecture-provider";
import type { EntityId } from "@/domain/architecture";
import { RequirementsWorkspace } from "@/features/requirements";
import { ResolutionWorkspace } from "@/features/resolution";

import { ComponentInspector } from "./component-inspector";
import { ConnectionEditor } from "./connection-editor";
import styles from "./workspace.module.css";

interface FloatingInspectorProps {
  readonly open: boolean;
  readonly selectedComponentId: EntityId | null;
  readonly onClose: () => void;
  readonly onSelectComponent: (id: EntityId | null) => void;
}

type InspectorTab =
  | "component"
  | "resolution"
  | "connections"
  | "evidence";

export function FloatingInspector({
  open,
  selectedComponentId,
  onClose,
  onSelectComponent,
}: FloatingInspectorProps) {
  const {
    architecture,
    capabilities,
    technologies,
    dispatchCommand,
    nextId,
    validationIssues,
  } = useArchitectureWorkspace();

  const [activeTab, setActiveTab] = useState<InspectorTab>("component");
  const [evidenceSection, setEvidenceSection] = useState<
    "requirements" | "constraints"
  >("requirements");

  if (!open || !architecture) return null;

  const selectedComponent = architecture.components.find(
    (c) => c.id === selectedComponentId,
  );

  return (
    <aside
      aria-label="Architecture Inspector"
      className={styles.floatingInspector}
    >
      {/* Modern Top Header */}
      <div className={styles.inspectorTopBar}>
        <div className={styles.inspectorHeading}>
          <div className={styles.inspectorTitleRow}>
            <h3>Inspector</h3>
            {selectedComponent ? (
              <span className={styles.inspectorSelectedName}>
                {selectedComponent.name}
              </span>
            ) : (
              <span className={styles.inspectorSelectedName}>
                Architecture Overview
              </span>
            )}
          </div>
        </div>
        <button
          aria-label="Close inspector"
          className={styles.miniCloseBtn}
          onClick={onClose}
          type="button"
        >
          ×
        </button>
      </div>

      {/* Pill Segmented Tabs */}
      <nav
        aria-label="Inspector navigation"
        className={styles.inspectorPillNav}
      >
        {(
          [
            { id: "component", label: "Component" },
            { id: "resolution", label: "Resolution" },
            { id: "connections", label: "Connections" },
            { id: "evidence", label: "Evidence" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            className={`${styles.inspectorPillBtn} ${activeTab === tab.id ? styles.inspectorPillBtnActive : ""}`}
            onClick={() => setActiveTab(tab.id)}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Tab Panel Content */}
      <div className={styles.inspectorScrollableContent}>
        {activeTab === "component" && (
          <ComponentInspector
            architecture={architecture}
            capabilities={capabilities}
            dispatchCommand={dispatchCommand}
            key={selectedComponentId ?? "empty"}
            onDeleted={() => onSelectComponent(null)}
            onSwitchTab={setActiveTab}
            selectedComponentId={selectedComponentId}
            technologies={technologies}
          />
        )}

        {activeTab === "resolution" && (
          <ResolutionWorkspace
            architecture={architecture}
            selectedComponentId={selectedComponentId}
          />
        )}

        {activeTab === "connections" && (
          <ConnectionEditor
            architecture={architecture}
            dispatchCommand={dispatchCommand}
            nextId={nextId}
          />
        )}

        {activeTab === "evidence" && (
          <div>
            <div className={styles.evidenceToggleRow}>
              <button
                className={`${styles.evidenceTabBtn} ${evidenceSection === "requirements" ? styles.evidenceTabBtnActive : ""}`}
                onClick={() => setEvidenceSection("requirements")}
                type="button"
              >
                Requirements ({architecture.requirements.length})
              </button>
              <button
                className={`${styles.evidenceTabBtn} ${evidenceSection === "constraints" ? styles.evidenceTabBtnActive : ""}`}
                onClick={() => setEvidenceSection("constraints")}
                type="button"
              >
                Constraints ({architecture.constraints.length})
              </button>
            </div>
            <RequirementsWorkspace
              architecture={architecture}
              dispatchCommand={dispatchCommand}
              issues={validationIssues}
              nextId={nextId}
              onInspectIssue={() => {}}
              section={evidenceSection}
            />
          </div>
        )}
      </div>
    </aside>
  );
}
