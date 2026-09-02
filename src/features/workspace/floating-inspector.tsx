"use client";

import { useState } from "react";
import { useArchitectureWorkspace } from "@/app/architecture-provider";
import { Badge } from "@/components/ui";
import type { EntityId } from "@/domain/architecture";
import { ActivityPanel } from "@/features/activity";
import { RequirementsWorkspace } from "@/features/requirements";
import { ResolutionWorkspace } from "@/features/resolution";

import { ComponentInspector } from "./component-inspector";
import { ConnectionEditor } from "./connection-editor";
import { ValidationPanel } from "./validation-panel";
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
  | "evidence"
  | "signals";

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
    validationLoading,
    validationError,
    refreshValidation,
    activityStore,
  } = useArchitectureWorkspace();

  const [activeTab, setActiveTab] = useState<InspectorTab>("component");
  const [evidenceSection, setEvidenceSection] = useState<
    "requirements" | "constraints"
  >("requirements");

  if (!open || !architecture) return null;

  const componentIds = new Set(architecture.components.map((c) => c.id));
  const selectedComponent = architecture.components.find(
    (c) => c.id === selectedComponentId,
  );
  const navigableEntityIds = new Set([
    architecture.id,
    ...architecture.requirements.map((r) => r.id),
    ...architecture.constraints.map((c) => c.id),
    ...architecture.components.map((c) => c.id),
    ...architecture.connections.map((c) => c.id),
  ]);

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
          {/* {validationIssues.length > 0 ? (
            <Badge tone="warning">{validationIssues.length} issues</Badge>
          ) : (
            <Badge tone="success">Valid</Badge>
          )} */}
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
            { id: "signals", label: "Signals" },
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
              onInspectIssue={() => setActiveTab("signals")}
              section={evidenceSection}
            />
          </div>
        )}

        {activeTab === "signals" && (
          <div className={styles.signalsSection}>
            <h4>Deterministic Validation</h4>
            <ValidationPanel
              architectureComponentIds={componentIds}
              error={validationError?.message ?? null}
              issues={validationIssues}
              loading={validationLoading}
              onNavigate={(id) => {
                onSelectComponent(id);
                setActiveTab("component");
              }}
              onRetry={refreshValidation}
            />

            <div className={styles.signalsDivider} />

            <h4>WebMCP Protocol Activity</h4>
            <ActivityPanel
              entityIds={navigableEntityIds}
              onNavigate={(id) => {
                if (componentIds.has(id)) {
                  onSelectComponent(id);
                  setActiveTab("component");
                }
              }}
              store={activityStore}
            />
          </div>
        )}
      </div>
    </aside>
  );
}
