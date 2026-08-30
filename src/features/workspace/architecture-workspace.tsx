"use client";

import { useMemo, useState } from "react";

import { useArchitectureWorkspace } from "@/app/architecture-provider";
import { ArchitectureCanvas } from "@/components/canvas";
import {
  Button,
  Dialog,
  ErrorState,
  InspectorShell,
  Panel,
  Skeleton,
  Tabs,
  TabsList,
  TabsPanel,
  TabsTrigger,
} from "@/components/ui";
import type { EntityId } from "@/domain/architecture";
import type { CapabilityDefinition } from "@/domain/catalog";
import { RequirementsWorkspace } from "@/features/requirements";

import { ArchitectureToolbar } from "./architecture-toolbar";
import { ComponentInspector } from "./component-inspector";
import { ComponentLibrary } from "./component-library";
import { ConnectionEditor } from "./connection-editor";
import { CreateArchitectureForm } from "./create-architecture-form";
import { useNarrowLayout } from "./use-narrow-layout";
import { ValidationPanel } from "./validation-panel";
import styles from "./workspace.module.css";

type InspectorTab = "component" | "connections";
type InputTab = "requirements" | "constraints" | "library";

export function ArchitectureWorkspace() {
  const {
    architecture,
    architectures,
    capabilities,
    createArchitecture,
    dispatchCommand,
    error,
    loadArchitecture,
    loading,
    nextId,
    refreshValidation,
    reloadArchitectures,
    validationError,
    validationIssues,
    validationLoading,
  } = useArchitectureWorkspace();
  const narrow = useNarrowLayout();
  const [selectedId, setSelectedComponentId] =
    useState<EntityId | null>(null);
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>("component");
  const [inputTab, setInputTab] = useState<InputTab>("requirements");
  const [newArchitectureOpen, setNewArchitectureOpen] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [clearing, setClearing] = useState(false);
  const componentIds = useMemo(
    () => new Set(architecture?.components.map(({ id }) => id) ?? []),
    [architecture?.components],
  );

  const selectedComponentId =
    selectedId && componentIds.has(selectedId) ? selectedId : null;

  if (loading && !architecture) {
    return (
      <main className={styles.loadingShell}>
        <Skeleton label="Loading architecture workspace" />
        <Skeleton label="Loading saved architectures" />
        <Skeleton label="Loading canvas" />
      </main>
    );
  }

  if (error && !architecture) {
    return (
      <main className={styles.centeredState}>
        <ErrorState
          action={
            error.retryable ? (
              <Button onClick={() => void reloadArchitectures()}>
                Retry loading
              </Button>
            ) : undefined
          }
          message={error.message}
          title="Workspace unavailable"
        />
      </main>
    );
  }

  if (!architecture) {
    return (
      <main className={styles.welcomeShell}>
        <div className={styles.welcomeBrand}>
          <span className={styles.brandMark} aria-hidden="true">
            AF
          </span>
          <span>ArchForge</span>
        </div>
        <section className={styles.welcomeCard}>
          <div>
            <p className={styles.eyebrow}>Local-first architecture design</p>
            <h1>Shape the system before choosing the stack.</h1>
            <p>
              Start with provider-neutral capabilities, connect them into a
              design, then use explicit evidence to resolve technologies.
            </p>
          </div>
          <CreateArchitectureForm
            onCreate={async (name, description) => {
              await createArchitecture(name, description);
            }}
          />
        </section>
      </main>
    );
  }

  async function addCapability(capability: CapabilityDefinition) {
    if (!architecture) return;
    const componentId = nextId("component");
    const index = architecture.components.length;
    await dispatchCommand({
      type: "component.add",
      architectureId: architecture.id,
      component: {
        id: componentId,
        capabilityId: capability.id,
        name: capability.label,
        description: capability.description,
        position: {
          x: 120 + (index % 3) * 300,
          y: 140 + Math.floor(index / 3) * 190,
        },
        existingInfrastructure: false,
      },
    });
    setSelectedComponentId(componentId);
    setInspectorTab("component");
    if (narrow) {
      setLibraryOpen(false);
      setInspectorOpen(true);
    }
  }

  async function clearArchitecture() {
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

  function navigateToComponent(componentId: EntityId) {
    setSelectedComponentId(componentId);
    setInspectorTab("component");
    if (narrow) setInspectorOpen(true);
  }

  function inspectValidationIssue(issueId: EntityId) {
    setLibraryOpen(false);
    requestAnimationFrame(() => {
      const issue = document.getElementById(`validation-${issueId}`);
      issue?.scrollIntoView({ behavior: "smooth", block: "center" });
      issue?.focus({ preventScroll: true });
    });
  }

  const designInputs = (
    <Tabs
      onValueChange={(value) => setInputTab(value as InputTab)}
      value={inputTab}
    >
      <TabsList aria-label="Design input sections">
        <TabsTrigger value="requirements">Requirements</TabsTrigger>
        <TabsTrigger value="constraints">Constraints</TabsTrigger>
        <TabsTrigger value="library">Library</TabsTrigger>
      </TabsList>
      <TabsPanel value="requirements">
        <RequirementsWorkspace
          architecture={architecture}
          dispatchCommand={dispatchCommand}
          issues={validationIssues}
          nextId={nextId}
          onInspectIssue={inspectValidationIssue}
          section="requirements"
        />
      </TabsPanel>
      <TabsPanel value="constraints">
        <RequirementsWorkspace
          architecture={architecture}
          dispatchCommand={dispatchCommand}
          issues={validationIssues}
          nextId={nextId}
          onInspectIssue={inspectValidationIssue}
          section="constraints"
        />
      </TabsPanel>
      <TabsPanel value="library">
        <ComponentLibrary capabilities={capabilities} onAdd={addCapability} />
      </TabsPanel>
    </Tabs>
  );
  const inspector = (
    <Tabs
      onValueChange={(value) => setInspectorTab(value as InspectorTab)}
      value={inspectorTab}
    >
      <TabsList aria-label="Inspector sections">
        <TabsTrigger value="component">Component</TabsTrigger>
        <TabsTrigger value="connections">Connections</TabsTrigger>
      </TabsList>
      <TabsPanel value="component">
        <ComponentInspector
          key={selectedComponentId ?? "empty"}
          architecture={architecture}
          capabilities={capabilities}
          dispatchCommand={dispatchCommand}
          onDeleted={() => setSelectedComponentId(null)}
          selectedComponentId={selectedComponentId}
        />
      </TabsPanel>
      <TabsPanel value="connections">
        <ConnectionEditor
          architecture={architecture}
          dispatchCommand={dispatchCommand}
          nextId={nextId}
        />
      </TabsPanel>
    </Tabs>
  );

  return (
    <main className={styles.workspace}>
      <ArchitectureToolbar
        architecture={architecture}
        architectures={architectures}
        loading={loading}
        narrow={narrow}
        onClear={() => setClearOpen(true)}
        onLoad={async (id) => {
          setSelectedComponentId(null);
          await loadArchitecture(id);
        }}
        onNew={() => setNewArchitectureOpen(true)}
        onOpenInspector={() => setInspectorOpen(true)}
        onOpenInputs={() => setLibraryOpen(true)}
        validationCount={validationIssues.length}
      />

      {error ? (
        <div className={styles.workspaceError} role="alert">
          <span>{error.message}</span>
          {error.retryable ? (
            <Button
              onClick={() => void reloadArchitectures()}
              size="compact"
              variant="secondary"
            >
              Retry
            </Button>
          ) : null}
        </div>
      ) : null}

      <div className={styles.editorGrid}>
        {!narrow ? (
          <Panel
            bodyClassName={styles.railBody}
            className={styles.libraryRail}
            subtitle="Evidence and provider-neutral building blocks"
            title="Design inputs"
          >
            {designInputs}
          </Panel>
        ) : null}

        <section className={styles.canvasRegion} aria-labelledby="workspace-title">
          <header className={styles.canvasHeader}>
            <div>
              <p className={styles.eyebrow}>
                Revision {architecture.revision} · saved locally
              </p>
              <h1 id="workspace-title">{architecture.name}</h1>
              {architecture.description ? (
                <p>{architecture.description}</p>
              ) : null}
            </div>
            <div className={styles.canvasMetrics} aria-label="Architecture totals">
              <span>
                {architecture.components.length}{" "}
                {architecture.components.length === 1 ? "component" : "components"}
              </span>
              <span>
                {architecture.connections.length}{" "}
                {architecture.connections.length === 1
                  ? "connection"
                  : "connections"}
              </span>
            </div>
          </header>
          <ArchitectureCanvas
            architecture={architecture}
            dispatchCommand={dispatchCommand}
            onSelectionChange={setSelectedComponentId}
            selectedComponentId={selectedComponentId}
          />
        </section>

        {!narrow ? (
          <InspectorShell
            bodyClassName={styles.inspectorBody}
            className={styles.inspectorRail}
            subtitle={
              selectedComponentId
                ? "Canonical component details"
                : "Select a node or manage connections"
            }
            title="Inspector"
          >
            {inspector}
          </InspectorShell>
        ) : null}

        <Panel
          bodyClassName={styles.validationBody}
          className={styles.validationRegion}
          subtitle="Derived from the canonical architecture"
          title="Validation"
        >
          <ValidationPanel
            architectureComponentIds={componentIds}
            error={validationError?.message ?? null}
            issues={validationIssues}
            loading={validationLoading}
            onNavigate={navigateToComponent}
            onRetry={refreshValidation}
          />
        </Panel>
      </div>

      <Dialog
        description="Create another local architecture. Your current design remains saved."
        onOpenChange={setNewArchitectureOpen}
        open={newArchitectureOpen}
        title="New architecture"
      >
        <CreateArchitectureForm
          onCancel={() => setNewArchitectureOpen(false)}
          onCreate={async (name, description) => {
            setSelectedComponentId(null);
            await createArchitecture(name, description);
            setNewArchitectureOpen(false);
          }}
        />
      </Dialog>

      <Dialog
        description="This removes all requirements, constraints, components, connections, and decisions while preserving the architecture itself."
        onOpenChange={setClearOpen}
        open={clearOpen}
        title="Clear architecture?"
      >
        <div className={styles.dialogActions}>
          <Button onClick={() => setClearOpen(false)} variant="secondary">
            Cancel
          </Button>
          <Button
            busy={clearing}
            onClick={() => void clearArchitecture()}
            variant="danger"
          >
            Clear architecture
          </Button>
        </div>
      </Dialog>

      {narrow ? (
        <>
          <Dialog
            description="Edit requirements, constraints, and provider-neutral capabilities."
            onOpenChange={setLibraryOpen}
            open={libraryOpen}
            title="Design inputs"
          >
            {designInputs}
          </Dialog>
          <Dialog
            description="Edit the selected component or manage directed connections."
            onOpenChange={setInspectorOpen}
            open={inspectorOpen}
            title="Inspector"
          >
            {inspector}
          </Dialog>
        </>
      ) : null}
    </main>
  );
}
