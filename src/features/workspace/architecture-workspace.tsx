"use client";

import { useEffect, useMemo, useState } from "react";

import { useArchitectureWorkspace } from "@/app/architecture-provider";
import type { ExportFormat } from "@/application/contracts";
import { ArchitectureCanvas } from "@/components/canvas";
import { Button, Dialog, ErrorState, Skeleton } from "@/components/ui";
import type { EntityId } from "@/domain/architecture";
import type { EditorTool } from "@/features/editor";

import { CanvasToolbar } from "./canvas-toolbar";
import { CreateArchitectureForm } from "./create-architecture-form";
import { ExportPopover } from "./export-popover";
import { FloatingInspector } from "./floating-inspector";
import { MinimalHeader } from "./minimal-header";
import { PrimitivePicker } from "./primitive-picker";
import { ShortcutsModal } from "./shortcuts-modal";
import { ARCHITECTURE_TEMPLATES, type ArchitectureTemplate } from "./templates-catalog";
import { WebMcpToolsModal } from "./webmcp-tools-modal";
import styles from "./workspace.module.css";

export function ArchitectureWorkspace() {
  const {
    architecture,
    architectures,
    capabilities,
    technologies,
    createArchitecture,
    dispatchCommand,
    downloadArchitecture,
    error,
    loadArchitecture,
    loading,
    nextId,
    recoverCorruptData,
    reloadArchitectures,
  } = useArchitectureWorkspace();

  const [activeTool, setActiveTool] = useState<EditorTool>("select");
  const [selectedId, setSelectedComponentId] = useState<EntityId | null>(null);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [primitivePickerOpen, setPrimitivePickerOpen] = useState(false);
  const [webMcpOpen, setWebMcpOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [newArchitectureOpen, setNewArchitectureOpen] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [recovering, setRecovering] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Keyboard shortcut listener for global actions (I, ?, etc.)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setWebMcpOpen((prev) => !prev);
      } else if (e.key === "i" || e.key === "I") {
        if (!e.metaKey && !e.ctrlKey) {
          e.preventDefault();
          setInspectorOpen((prev) => !prev);
        }
      } else if (e.key === "?" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setShortcutsOpen(true);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const componentIds = useMemo(
    () => new Set(architecture?.components.map(({ id }) => id) ?? []),
    [architecture?.components],
  );

  const selectedComponentId =
    selectedId && componentIds.has(selectedId) ? selectedId : null;

  async function handleRenameArchitecture(newName: string) {
    if (!architecture) return;
    await dispatchCommand({
      type: "architecture.update",
      architectureId: architecture.id,
      patch: { name: newName },
    });
  }

  async function handleLoadTemplate(template: ArchitectureTemplate) {
    const arch = await createArchitecture(
      template.request.metadata.name,
      template.request.metadata.description,
    );

    const componentKeyToId = new Map<string, string>();
    for (const comp of template.request.components) {
      const compId = nextId("component");
      componentKeyToId.set(comp.key, compId);
      await dispatchCommand({
        type: "component.add",
        architectureId: arch.id,
        component: {
          id: compId,
          capabilityId: comp.capabilityId,
          name: comp.name,
          description: comp.description ?? "",
          position: comp.position ?? { x: 100, y: 100 },
          existingInfrastructure: comp.existingInfrastructure ?? false,
        },
      });
    }

    for (const conn of template.request.connections) {
      const srcId = componentKeyToId.get(conn.sourceComponentKey);
      const tgtId = componentKeyToId.get(conn.targetComponentKey);
      if (srcId && tgtId) {
        await dispatchCommand({
          type: "connection.connect",
          architectureId: arch.id,
          connection: {
            id: nextId("connection"),
            sourceComponentId: srcId,
            targetComponentId: tgtId,
            relationship: conn.relationship,
            label: conn.label ?? "",
          },
        });
      }
    }

    for (const res of template.request.resolutions) {
      const compId = componentKeyToId.get(res.componentKey);
      if (compId && res.technologyId) {
        await dispatchCommand({
          type: "resolution.set-technology",
          architectureId: arch.id,
          componentId: compId,
          technologyId: res.technologyId,
        });
      }
    }
  }

  async function clearCurrentArchitecture() {
    if (!architecture) return;
    setClearing(true);
    try {
      await dispatchCommand({
        type: "architecture.clear",
        architectureId: architecture.id,
      });
      setSelectedComponentId(null);
      setClearOpen(false);
    } finally {
      setClearing(false);
    }
  }

  async function handleExport(format: ExportFormat) {
    setExporting(true);
    try {
      await downloadArchitecture(format);
      setExportOpen(false);
    } finally {
      setExporting(false);
    }
  }

  function handleSelectCapabilityFromPicker(capabilityId: string) {
    setActiveTool(capabilityId);
    setPrimitivePickerOpen(false);
  }

  if (loading && !architecture) {
    return (
      <main className={styles.loadingViewport} id="main-content">
        <Skeleton label="Loading canvas..." />
      </main>
    );
  }

  if (error && !architecture) {
    const recoveryAction =
      error.code === "corrupt-data" ? (
        <Button
          busy={recovering}
          onClick={() => {
            setRecovering(true);
            void recoverCorruptData()
              .catch(() => undefined)
              .finally(() => setRecovering(false));
          }}
        >
          Remove unreadable data
        </Button>
      ) : error.retryable ? (
        <Button onClick={() => void reloadArchitectures()}>Retry loading</Button>
      ) : undefined;

    return (
      <main className={styles.centeredState} id="main-content">
        <ErrorState
          action={recoveryAction}
          headingLevel={1}
          message={error.message}
          title="Workspace unavailable"
        />
      </main>
    );
  }

  if (!architecture) {
    return (
      <main className={styles.welcomeViewport} id="main-content">
        <div className={styles.welcomeHero}>
          <div className={styles.welcomeBrand}>
            <span className={styles.brandIconLarge} aria-hidden="true">AF</span>
            <h1>ArchForge</h1>
          </div>
          <div className={styles.welcomeCustomSection}>
            <CreateArchitectureForm
              className={styles.welcomeCreateForm}
              onCreate={async (name) => {
                await createArchitecture(name);
              }}
            />
          </div>

          <h2 className={styles.welcomeTemplatesHeading}>Choose a template</h2>
          <div className={styles.welcomeTemplatesGrid}>
            {ARCHITECTURE_TEMPLATES.map((tmpl) => (
              <button
                key={tmpl.id}
                className={styles.welcomeTemplateCard}
                onClick={() => void handleLoadTemplate(tmpl)}
                type="button"
              >
                <strong>{tmpl.name}</strong>
              </button>
            ))}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.editorViewport} id="main-content">
      {/* Minimal Header */}
      <MinimalHeader
        architecture={architecture}
        architectures={architectures}
        inspectorOpen={inspectorOpen}
        onClearArchitecture={() => setClearOpen(true)}
        onLoadArchitecture={loadArchitecture}
        onNewArchitecture={() => setNewArchitectureOpen(true)}
        onOpenExport={() => setExportOpen(true)}
        onOpenShortcuts={() => setShortcutsOpen(true)}
        onOpenWebMcp={() => setWebMcpOpen(true)}
        onRenameArchitecture={handleRenameArchitecture}
        onToggleInspector={() => setInspectorOpen((prev) => !prev)}
      />

      {/* Main 100% Canvas Region */}
      <div className={styles.canvasWrapper}>
        <ArchitectureCanvas
          activeTool={activeTool}
          architecture={architecture}
          dispatchCommand={dispatchCommand}
          nextId={nextId}
          onOpenInspector={() => setInspectorOpen(true)}
          onOpenShortcuts={() => setShortcutsOpen(true)}
          onSelectionChange={setSelectedComponentId}
          onToolChange={setActiveTool}
          selectedComponentId={selectedComponentId}
          technologies={technologies}
        />
      </div>

      {/* Floating Bottom Toolbar */}
      <CanvasToolbar
        activeTool={activeTool}
        onOpenPrimitivePicker={() => setPrimitivePickerOpen(true)}
        onSelectTool={setActiveTool}
      />

      {/* Primitive Picker Popover */}
      <PrimitivePicker
        capabilities={capabilities}
        onClose={() => setPrimitivePickerOpen(false)}
        onSelectCapability={handleSelectCapabilityFromPicker}
        open={primitivePickerOpen}
      />

      {/* WebMCP Tools Modal */}
      <WebMcpToolsModal
        onClose={() => setWebMcpOpen(false)}
        open={webMcpOpen}
      />

      {/* Keyboard Shortcuts Modal */}
      <ShortcutsModal
        onClose={() => setShortcutsOpen(false)}
        open={shortcutsOpen}
      />

      {/* Floating Inspector Drawer */}
      <FloatingInspector
        onClose={() => setInspectorOpen(false)}
        onSelectComponent={setSelectedComponentId}
        open={inspectorOpen}
        selectedComponentId={selectedComponentId}
      />

      {/* Export Popover */}
      <ExportPopover
        exporting={exporting}
        onClose={() => setExportOpen(false)}
        onExport={handleExport}
        open={exportOpen}
      />

      {/* New Architecture Dialog */}
      <Dialog
        description="Create another local architecture. Your current design remains saved."
        onOpenChange={setNewArchitectureOpen}
        open={newArchitectureOpen}
        title="New Architecture"
      >
        <CreateArchitectureForm
          onCancel={() => setNewArchitectureOpen(false)}
          onCreate={async (name) => {
            setSelectedComponentId(null);
            await createArchitecture(name);
            setNewArchitectureOpen(false);
          }}
        />
      </Dialog>

      {/* Clear Architecture Dialog */}
      <Dialog
        description="This removes all components, connections, and decisions while preserving the architecture record."
        onOpenChange={setClearOpen}
        open={clearOpen}
        title="Clear canvas?"
      >
        <div className={styles.dialogActions}>
          <Button onClick={() => setClearOpen(false)} variant="secondary">
            Cancel
          </Button>
          <Button
            busy={clearing}
            onClick={() => void clearCurrentArchitecture()}
            variant="danger"
          >
            Clear canvas
          </Button>
        </div>
      </Dialog>
    </main>
  );
}
