"use client";

import { useEffect, useMemo, useState } from "react";

import { useArchitectureWorkspace } from "@/app/architecture-provider";
import type { ExportFormat } from "@/application/contracts";
import { ArchitectureCanvas } from "@/components/canvas";
import { BrandLogo, Button, Dialog, ErrorState, Skeleton } from "@/components/ui";
import type { EntityId } from "@/domain/architecture";
import type { EditorTool } from "@/features/editor";

import { CanvasToolbar } from "./canvas-toolbar";
import { CreateArchitectureForm } from "./create-architecture-form";
import { ExportPopover } from "./export-popover";
import { FloatingInspector } from "./floating-inspector";
import { MinimalHeader } from "./minimal-header";
import { PrimitivePicker } from "./primitive-picker";
import { ShortcutsModal } from "./shortcuts-modal";
import {
  ARCHITECTURE_TEMPLATES,
  type ArchitectureTemplate,
} from "./templates-catalog";
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
  const [templatesModalOpen, setTemplatesModalOpen] = useState(false);
  const [directSystemName, setDirectSystemName] = useState("");
  const [directCreating, setDirectCreating] = useState(false);
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
        <Button onClick={() => void reloadArchitectures()}>
          Retry loading
        </Button>
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

  // Welcome screen
  if (!architecture) {
    return (
      <main className={styles.welcomeViewport} id="main-content">
        {/* Minimal Waveframe-style Navbar */}
        <header className={styles.welcomeNavbar}>
          <div className={styles.welcomeNavLeft}>
            <BrandLogo size={24} wordmarkSize={16} />
            {architectures.length > 0 ? (
              <select
                aria-label="Open saved system"
                className={styles.welcomeArchSelect}
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) {
                    void loadArchitecture(e.target.value);
                  }
                }}
              >
                <option disabled value="">
                  Open saved system ({architectures.length})...
                </option>
                {architectures.map((arch) => (
                  <option key={arch.id} value={arch.id}>
                    {arch.name}
                  </option>
                ))}
              </select>
            ) : null}
          </div>

          <div className={styles.welcomeNavRight}>
            <button
              className={styles.welcomeNavBtn}
              onClick={() => setWebMcpOpen(true)}
              title="Inspect WebMCP tools and status"
              type="button"
            >
              <span className={styles.navBtnPrompt}>&gt;_</span>
              <span>WebMCP Tools</span>
            </button>
          </div>
        </header>

        {/* Centered Minimal Hero */}
        <div className={styles.welcomeMain}>
          <div className={styles.welcomeHero}>
            {/* Squircle Card with Blue Outline Architecture Icon */}
            <div className={styles.welcomeIconCard} aria-hidden="true">
              <svg
                fill="none"
                height="34"
                stroke="#2563eb"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.8"
                viewBox="0 0 24 24"
                width="34"
              >
                <rect height="18" rx="3" width="18" x="3" y="3" />
                <path d="M3 9h18" />
                <path d="M9 21V9" />
                <path d="M14 14h3" />
                <path d="M14 17h2" />
              </svg>
            </div>

            <h1 className={styles.welcomeTitle}>
              Create a system to start designing
            </h1>
            <p className={styles.welcomeSubtitle}>
              Start with a clean canvas or explore battle-tested architecture
              patterns to begin modeling.
            </p>

            {/* Direct Input Form */}
            <form
              className={styles.welcomeDirectForm}
              onSubmit={async (e) => {
                e.preventDefault();
                const trimmed = directSystemName.trim();
                if (!trimmed) return;
                setDirectCreating(true);
                try {
                  await createArchitecture(trimmed);
                } finally {
                  setDirectCreating(false);
                }
              }}
            >
              <div className={styles.welcomeInputWrapper}>
                <svg
                  aria-hidden="true"
                  className={styles.welcomeInputIcon}
                  fill="none"
                  height="16"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  width="16"
                >
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
                <input
                  autoFocus
                  className={styles.welcomeDirectInput}
                  onChange={(e) => setDirectSystemName(e.target.value)}
                  placeholder="Enter system name (e.g. Distributed Order Platform)..."
                  required
                  type="text"
                  value={directSystemName}
                />
                <Button
                  busy={directCreating}
                  disabled={!directSystemName.trim()}
                  size="compact"
                  type="submit"
                  variant="primary"
                >
                  Create System
                </Button>
              </div>
            </form>

            {/* OR Option Section with Link Variant Button */}
            <div className={styles.welcomeOrSection}>
              <span className={styles.welcomeOrDividerLine} />
              <span className={styles.welcomeOrText}>or</span>
              <span className={styles.welcomeOrDividerLine} />
            </div>

            <div className={styles.welcomeOrAction}>
              <Button
                className={styles.welcomeTemplateLinkBtn}
                onClick={() => setTemplatesModalOpen(true)}
                variant="link"
              >
                Browse curated templates →
              </Button>
            </div>

            {/* Bottom Minimal Feature Badges */}
            <div className={styles.welcomePillsRow}>
              <div className={styles.welcomePill}>
                <span className={styles.pillIconAmber} aria-hidden="true">
                  ⚡
                </span>
                <span>Local-First (IndexedDB)</span>
              </div>

              <button
                className={styles.welcomePillButton}
                onClick={() => setWebMcpOpen(true)}
                title="View WebMCP protocol assistance"
                type="button"
              >
                <span className={styles.pillIconCyan} aria-hidden="true">
                  🤖
                </span>
                <span>WebMCP Agent Ready</span>
              </button>
            </div>
          </div>
        </div>

        {/* New Architecture Dialog */}
        <Dialog
          description="Start a new architecture on a blank canvas."
          onOpenChange={setNewArchitectureOpen}
          open={newArchitectureOpen}
          title="Create new system"
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

        {/* Curated Templates Dialog */}
        <Dialog
          className={styles.templatesDialog}
          description="Select a production-grade architecture pattern to immediately initialize your workspace."
          onOpenChange={setTemplatesModalOpen}
          open={templatesModalOpen}
          title="Curated Architecture Templates"
        >
          <div className={styles.templateDialogGrid}>
            {ARCHITECTURE_TEMPLATES.map((tmpl) => (
              <button
                key={tmpl.id}
                className={styles.welcomeTemplateCard}
                onClick={async () => {
                  setTemplatesModalOpen(false);
                  await handleLoadTemplate(tmpl);
                }}
                type="button"
              >
                <div className={styles.welcomeTemplateCardTop}>
                  <span
                    className={styles.templateCategoryBadge}
                    data-category={tmpl.category
                      .toLowerCase()
                      .replace(/[^a-z0-9]+/g, "-")}
                  >
                    {tmpl.category}
                  </span>
                  <span className={styles.templateArrowAffordance}>
                    Use Template →
                  </span>
                </div>
                <strong className={styles.welcomeTemplateTitle}>
                  {tmpl.name}
                </strong>
                <p className={styles.welcomeTemplateDesc}>
                  {tmpl.description}
                </p>
                <div className={styles.welcomeTemplateMeta}>
                  <span className={styles.welcomeTemplateMetaBadge}>
                    {tmpl.request.components.length} components
                  </span>
                  <span className={styles.welcomeTemplateMetaBadge}>
                    {tmpl.request.connections.length} connections
                  </span>
                </div>
              </button>
            ))}
          </div>
        </Dialog>

        {/* WebMCP Tools Modal */}
        <WebMcpToolsModal
          onClose={() => setWebMcpOpen(false)}
          open={webMcpOpen}
        />
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
