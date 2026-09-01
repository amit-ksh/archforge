"use client";

import { useEffect, useId, useMemo, useReducer, useRef, useState } from "react";
import type { PointerEvent } from "react";

import type { ArchitectureCommand } from "@/application/commands";
import type { Architecture, EntityId, Position } from "@/domain/architecture";
import type { TechnologyDefinition } from "@/domain/catalog";
import {
  editorReducer,
  initialEditorState,
  projectArchitecture,
  ZOOM_STEP,
  type EditorTool,
} from "@/features/editor";

import { CanvasConnection } from "./canvas-connection";
import { CanvasNode } from "./canvas-node";
import { SelectionToolbar } from "./selection-toolbar";
import styles from "./canvas.module.css";

const WORLD_SIZE = 8000;
const NODE_WIDTH = 224;
const NODE_HEIGHT = 110;

export interface ArchitectureCanvasProps {
  readonly architecture: Architecture;
  readonly activeTool?: EditorTool;
  readonly onToolChange?: (tool: EditorTool) => void;
  readonly onOpenInspector?: () => void;
  readonly onOpenShortcuts?: () => void;
  readonly dispatchCommand: (command: ArchitectureCommand) => Promise<void>;
  readonly onSelectionChange?: (componentId: EntityId | null) => void;
  readonly selectedComponentId?: EntityId | null;
  readonly nextId: (prefix: string) => EntityId;
  readonly technologies: readonly TechnologyDefinition[];
}

interface PanState {
  readonly pointerId: number;
  clientX: number;
  clientY: number;
}

export function ArchitectureCanvas({
  architecture,
  activeTool = "select",
  onToolChange,
  onOpenInspector,
  onOpenShortcuts,
  dispatchCommand,
  onSelectionChange,
  selectedComponentId,
  nextId,
  technologies,
}: ArchitectureCanvasProps) {
  const projection = useMemo(
    () => projectArchitecture(architecture),
    [architecture],
  );
  const [editor, dispatch] = useReducer(editorReducer, initialEditorState);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const pan = useRef<PanState | null>(null);
  const [isSpacePressed, setIsSpacePressed] = useState(false);

  // Sync external activeTool if passed
  useEffect(() => {
    if (activeTool !== editor.activeTool) {
      dispatch({ type: "tool.set", tool: activeTool });
    }
  }, [activeTool, editor.activeTool]);

  const markerId = `canvas-arrow-${useId().replaceAll(":", "")}`;
  const nodesById = useMemo(
    () => new Map(projection.nodes.map((node) => [node.id, node])),
    [projection.nodes],
  );

  function positionFor(componentId: EntityId): Position | null {
    return (
      editor.draftPositions[componentId] ??
      nodesById.get(componentId)?.position ??
      null
    );
  }

  const selection =
    selectedComponentId !== undefined
      ? selectedComponentId
      : editor.selectedComponentId;

  const selectedNode = selection ? nodesById.get(selection) : null;
  const selectedNodePos = selection ? positionFor(selection) : null;

  async function commitPosition(componentId: EntityId, position: Position) {
    setError(null);
    try {
      await dispatchCommand({
        type: "component.update",
        architectureId: architecture.id,
        componentId,
        patch: { position },
      });
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "The component position could not be saved.",
      );
    } finally {
      dispatch({ type: "position.clear", componentId });
    }
  }

  async function renameComponent(componentId: EntityId, newName: string) {
    setError(null);
    try {
      await dispatchCommand({
        type: "component.update",
        architectureId: architecture.id,
        componentId,
        patch: { name: newName },
      });
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "The component name could not be updated.",
      );
    }
  }

  async function setTechnology(componentId: EntityId, technologyId: EntityId | null) {
    setError(null);
    try {
      await dispatchCommand({
        type: "resolution.set-technology",
        architectureId: architecture.id,
        componentId,
        technologyId,
      });
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "The technology choice could not be updated.",
      );
    }
  }

  async function duplicateComponent(componentId: EntityId) {
    const original = nodesById.get(componentId);
    if (!original) return;
    const pos = positionFor(componentId) ?? original.position;
    const newId = nextId("component");
    setError(null);
    try {
      await dispatchCommand({
        type: "component.add",
        architectureId: architecture.id,
        component: {
          id: newId,
          capabilityId: original.capabilityId,
          name: `${original.name} (Copy)`,
          description: original.description,
          position: { x: pos.x + 40, y: pos.y + 40 },
          existingInfrastructure: original.existingInfrastructure,
        },
      });
      selectComponent(newId);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Failed to duplicate component.",
      );
    }
  }

  async function deleteComponent(
    componentId: EntityId,
    clearSelection = true,
  ): Promise<boolean> {
    setError(null);
    try {
      await dispatchCommand({
        type: "component.remove",
        architectureId: architecture.id,
        componentId,
      });
      if (clearSelection) {
        dispatch({ type: "selection.clear" });
        onSelectionChange?.(null);
      }
      return true;
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Failed to delete component.",
      );
      return false;
    }
  }

  async function deleteComponents(componentIds: readonly EntityId[]) {
    for (const componentId of componentIds) {
      const deleted = await deleteComponent(componentId, false);
      if (!deleted) return;
    }
    dispatch({ type: "selection.clear" });
    onSelectionChange?.(null);
  }

  async function deleteConnection(connectionId: EntityId) {
    setError(null);
    try {
      await dispatchCommand({
        type: "connection.remove",
        architectureId: architecture.id,
        connectionId,
      });
      dispatch({ type: "selection.clear" });
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Failed to delete connection.",
      );
    }
  }

  async function updateConnectionLabel(connectionId: EntityId, label: string) {
    setError(null);
    try {
      await dispatchCommand({
        type: "connection.update",
        architectureId: architecture.id,
        connectionId,
        patch: { label },
      });
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Failed to update connection label.",
      );
    }
  }

  async function createConnection(sourceId: EntityId, targetId: EntityId) {
    if (sourceId === targetId) return;
    // Check if connection already exists
    const exists = architecture.connections.some(
      (c) => c.sourceComponentId === sourceId && c.targetComponentId === targetId,
    );
    if (exists) return;

    setError(null);
    try {
      await dispatchCommand({
        type: "connection.connect",
        architectureId: architecture.id,
        connection: {
          id: nextId("connection"),
          sourceComponentId: sourceId,
          targetComponentId: targetId,
          relationship: "request",
          label: "",
        },
      });
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Failed to connect components.",
      );
    }
  }

  async function placePrimitiveAt(capabilityId: string, worldPos: Position) {
    const componentId = nextId("component");
    const label = capabilityId
      .replace(/^capability-/, "")
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

    setError(null);
    try {
      await dispatchCommand({
        type: "component.add",
        architectureId: architecture.id,
        component: {
          id: componentId,
          capabilityId,
          name: label,
          description: "",
          position: {
            x: Math.round(worldPos.x - NODE_WIDTH / 2),
            y: Math.round(worldPos.y - NODE_HEIGHT / 2),
          },
          existingInfrastructure: false,
        },
      });
      selectComponent(componentId);
      onToolChange?.("select");
      dispatch({ type: "tool.set", tool: "select" });
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Failed to place component.",
      );
    }
  }

  function selectComponent(componentId: EntityId | null) {
    dispatch({ type: "component.select", componentId });
    onSelectionChange?.(componentId);
  }

  function selectConnection(connectionId: EntityId | null) {
    dispatch({ type: "connection.select", connectionId });
    onSelectionChange?.(null);
  }

  // Keyboard shortcut listener
  useEffect(() => {
    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement
      ) {
        return;
      }

      if ((event.metaKey || event.ctrlKey) && (event.key === "a" || event.key === "A")) {
        event.preventDefault();
        const allIds = projection.nodes.map((n) => n.id);
        dispatch({ type: "component.select-all", componentIds: allIds });
        if (allIds.length === 1) onSelectionChange?.(allIds[0]);
        else onSelectionChange?.(null);
        return;
      }

      if ((event.metaKey || event.ctrlKey) && (event.key === "d" || event.key === "D")) {
        event.preventDefault();
        if (editor.selectedComponentId) {
          void duplicateComponent(editor.selectedComponentId);
        }
        return;
      }

      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
        if (editor.selectedComponentId) {
          event.preventDefault();
          const step = event.shiftKey ? 32 : 8;
          const delta = {
            ArrowLeft: { x: -step, y: 0 },
            ArrowRight: { x: step, y: 0 },
            ArrowUp: { x: 0, y: -step },
            ArrowDown: { x: 0, y: step },
          }[event.key]!;
          const current = positionFor(editor.selectedComponentId);
          if (current) {
            void commitPosition(editor.selectedComponentId, {
              x: current.x + delta.x,
              y: current.y + delta.y,
            });
          }
          return;
        }
      }

      if (event.key === "?" && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        onOpenShortcuts?.();
        return;
      }

      if (event.code === "Space") {
        setIsSpacePressed(true);
      } else if (event.key === "v" || event.key === "V") {
        dispatch({ type: "tool.set", tool: "select" });
        onToolChange?.("select");
      } else if (event.key === "h" || event.key === "H") {
        dispatch({ type: "tool.set", tool: "pan" });
        onToolChange?.("pan");
      } else if (event.key === "a" || event.key === "A" || event.key === "l" || event.key === "L") {
        dispatch({ type: "tool.set", tool: "arrow" });
        onToolChange?.("arrow");
      } else if (event.key === "Escape") {
        dispatch({ type: "selection.clear" });
        dispatch({ type: "tool.set", tool: "select" });
        onToolChange?.("select");
        onSelectionChange?.(null);
      } else if (event.key === "Delete" || event.key === "Backspace") {
        if (editor.selectedComponentIds.length > 0) {
          event.preventDefault();
          void deleteComponents(editor.selectedComponentIds);
        } else if (editor.selectedConnectionId) {
          event.preventDefault();
          void deleteConnection(editor.selectedConnectionId);
        }
      } else if (event.key === "=" || event.key === "+") {
        event.preventDefault();
        dispatch({ type: "viewport.zoom", delta: ZOOM_STEP });
      } else if (event.key === "-") {
        event.preventDefault();
        dispatch({ type: "viewport.zoom", delta: -ZOOM_STEP });
      } else if (event.key === "0") {
        event.preventDefault();
        dispatch({ type: "viewport.reset" });
      }
    }

    function handleKeyUp(event: globalThis.KeyboardEvent) {
      if (event.code === "Space") {
        setIsSpacePressed(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  });

  // Screen to World coordinate conversion
  function clientToWorld(clientX: number, clientY: number): Position {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    const screenX = clientX - rect.left;
    const screenY = clientY - rect.top;
    return {
      x: (screenX - editor.viewport.x) / editor.viewport.zoom,
      y: (screenY - editor.viewport.y) / editor.viewport.zoom,
    };
  }

  function handleCanvasPointerDown(event: PointerEvent<HTMLDivElement>) {
    // If placing a primitive tool
    if (editor.activeTool.startsWith("capability-")) {
      const worldPos = clientToWorld(event.clientX, event.clientY);
      void placePrimitiveAt(editor.activeTool, worldPos);
      return;
    }

    // Pan mode (middle click, pan tool, or spacebar + left click)
    const isPanAction =
      event.button === 1 ||
      editor.activeTool === "pan" ||
      isSpacePressed ||
      event.button === 0;

    if (isPanAction && event.button === 0) {
      event.currentTarget.setPointerCapture(event.pointerId);
      pan.current = {
        pointerId: event.pointerId,
        clientX: event.clientX,
        clientY: event.clientY,
      };
      if (editor.activeTool === "select" && !isSpacePressed) {
        dispatch({ type: "selection.clear" });
        onSelectionChange?.(null);
      }
    }
  }

  function handleCanvasPointerMove(event: PointerEvent<HTMLDivElement>) {
    // Update live connection line if connecting
    if (editor.connecting) {
      const worldPos = clientToWorld(event.clientX, event.clientY);
      dispatch({ type: "connect.move", currentPos: worldPos });
      return;
    }

    if (!pan.current || pan.current.pointerId !== event.pointerId) return;
    const dx = event.clientX - pan.current.clientX;
    const dy = event.clientY - pan.current.clientY;
    pan.current.clientX = event.clientX;
    pan.current.clientY = event.clientY;
    dispatch({ type: "viewport.pan", dx, dy });
  }

  function handleCanvasPointerUp(event: PointerEvent<HTMLDivElement>) {
    if (editor.connecting) {
      // Check if dropped on a target node
      const worldPos = clientToWorld(event.clientX, event.clientY);
      for (const node of projection.nodes) {
        const pos = positionFor(node.id) ?? node.position;
        if (
          worldPos.x >= pos.x &&
          worldPos.x <= pos.x + NODE_WIDTH &&
          worldPos.y >= pos.y &&
          worldPos.y <= pos.y + NODE_HEIGHT
        ) {
          if (node.id !== editor.connecting.sourceComponentId) {
            void createConnection(editor.connecting.sourceComponentId, node.id);
          }
          break;
        }
      }
      dispatch({ type: "connect.end" });
    }

    if (pan.current?.pointerId === event.pointerId) {
      pan.current = null;
    }
  }

  // Native non-passive wheel event listener to prevent browser page zooming
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;

    function handleNativeWheel(event: globalThis.WheelEvent) {
      event.preventDefault();
      if (event.ctrlKey || event.metaKey) {
        // Pinch to zoom or Ctrl+Wheel zoom
        const delta = event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP;
        const targetEl = canvasRef.current;
        const rect = targetEl ? targetEl.getBoundingClientRect() : null;
        const center = rect
          ? { x: event.clientX - rect.left, y: event.clientY - rect.top }
          : undefined;
        dispatch({ type: "viewport.zoom", delta, center });
      } else {
        // Two finger pan or scroll pan
        dispatch({ type: "viewport.pan", dx: -event.deltaX, dy: -event.deltaY });
      }
    }

    el.addEventListener("wheel", handleNativeWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", handleNativeWheel);
    };
  }, []);

  function handleStartConnect(sourceId: EntityId, startPos: Position) {
    dispatch({
      type: "connect.start",
      sourceComponentId: sourceId,
      currentPos: startPos,
    });
  }

  function handleNodeSelect(nodeId: EntityId, isShift = false) {
    if (editor.activeTool === "arrow" && editor.selectedComponentId && editor.selectedComponentId !== nodeId) {
      // Connect tool clicked source then target
      void createConnection(editor.selectedComponentId, nodeId);
      dispatch({ type: "tool.set", tool: "select" });
      onToolChange?.("select");
      return;
    }

    if (isShift) {
      dispatch({ type: "component.toggle-select", componentId: nodeId });
    } else {
      selectComponent(nodeId);
    }
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    if (e.dataTransfer.types.includes("application/archforge-capability")) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
    }
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    const capabilityId = e.dataTransfer.getData("application/archforge-capability");
    if (capabilityId) {
      e.preventDefault();
      const worldPos = clientToWorld(e.clientX, e.clientY);
      void placePrimitiveAt(capabilityId, worldPos);
    }
  }

  // Calculate connecting line path
  let connectingPath = "";
  if (editor.connecting) {
    const srcPos = positionFor(editor.connecting.sourceComponentId);
    if (srcPos) {
      const x1 = srcPos.x + NODE_WIDTH / 2;
      const y1 = srcPos.y + NODE_HEIGHT / 2;
      const x2 = editor.connecting.currentPos.x;
      const y2 = editor.connecting.currentPos.y;
      connectingPath = `M ${x1} ${y1} L ${x2} ${y2}`;
    }
  }

  return (
    <div
      className={styles.canvasContainer}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      ref={canvasRef}
      style={{
        cursor:
          editor.activeTool === "pan" || isSpacePressed
            ? "grab"
            : editor.activeTool.startsWith("capability-")
              ? "crosshair"
              : editor.activeTool === "arrow"
                ? "crosshair"
                : "default",
      }}
    >
      {error ? (
        <div className={styles.canvasToast} role="alert">
          <span>{error}</span>
          <button onClick={() => setError(null)} type="button">×</button>
        </div>
      ) : null}

      <div
        className={styles.canvas}
        onPointerDown={handleCanvasPointerDown}
        onPointerMove={handleCanvasPointerMove}
        onPointerUp={handleCanvasPointerUp}
      >
        {/* Empty state hint */}
        {projection.nodes.length === 0 ? (
          <div className={styles.emptyStateContainer}>
            <div className={styles.emptyCard}>
              <div className={styles.emptyIcon}>✦</div>
              <h3>Start designing your architecture</h3>
              <p>Pick or drag a primitive from the toolbar below or press <strong>+</strong> to add components.</p>
            </div>
          </div>
        ) : null}

        {/* Viewport Transform Layer */}
        <div
          className={styles.viewportTransform}
          style={{
            transform: `translate(${editor.viewport.x}px, ${editor.viewport.y}px) scale(${editor.viewport.zoom})`,
            transformOrigin: "0 0",
          }}
        >
          {/* SVG Canvas for Connections */}
          <svg
            aria-label="Architecture connections"
            className={styles.connectionSvgLayer}
            height={WORLD_SIZE}
            role="group"
            width={WORLD_SIZE}
          >
            <defs>
              <marker
                id={markerId}
                markerHeight="8"
                markerUnits="userSpaceOnUse"
                markerWidth="8"
                orient="auto-start-reverse"
                refX="7"
                refY="4"
              >
                <path d="M 0 1 L 7 4 L 0 7 z" fill="var(--text-muted, #64748b)" />
              </marker>
              <marker
                id={`${markerId}-selected`}
                markerHeight="8"
                markerUnits="userSpaceOnUse"
                markerWidth="8"
                orient="auto-start-reverse"
                refX="7"
                refY="4"
              >
                <path d="M 0 1 L 7 4 L 0 7 z" fill="var(--interactive, #2563eb)" />
              </marker>
            </defs>

            {/* Rendered Component Connections */}
            {projection.connections.map((connection) => {
              const source = positionFor(connection.sourceComponentId);
              const target = positionFor(connection.targetComponentId);
              if (!source || !target) return null;

              return (
                <CanvasConnection
                  key={connection.id}
                  connection={connection}
                  isEditing={editor.editingConnectionId === connection.id}
                  markerId={markerId}
                  onSelect={() => selectConnection(connection.id)}
                  onStartEditing={() => dispatch({ type: "connection.edit", connectionId: connection.id })}
                  onStopEditing={() => dispatch({ type: "connection.edit", connectionId: null })}
                  onUpdateLabel={(newLabel) => void updateConnectionLabel(connection.id, newLabel)}
                  selected={editor.selectedConnectionId === connection.id}
                  sourcePos={source}
                  targetPos={target}
                />
              );
            })}

            {/* Live Interactive Connecting Line */}
            {editor.connecting && connectingPath ? (
              <path
                className={styles.connectingLivePath}
                d={connectingPath}
                markerEnd={`url(#${markerId}-selected)`}
              />
            ) : null}
          </svg>

          {/* Component Nodes */}
          {projection.nodes.map((node) => (
            <CanvasNode
              key={node.id}
              node={node}
              position={positionFor(node.id) ?? node.position}
              selected={editor.selectedComponentIds.includes(node.id)}
              zoom={editor.viewport.zoom}
              isEditing={editor.editingNodeId === node.id}
              onSelect={() => handleNodeSelect(node.id)}
              onStartConnect={(portPos) => handleStartConnect(node.id, portPos)}
              onStartRename={() => dispatch({ type: "node.edit", componentId: node.id })}
              onRename={(newName) => renameComponent(node.id, newName)}
              onStopRename={() => dispatch({ type: "node.edit", componentId: null })}
              onDraftPosition={(position) =>
                dispatch({
                  type: "position.draft",
                  componentId: node.id,
                  position,
                })
              }
              onCommitPosition={(position) => commitPosition(node.id, position)}
            />
          ))}

          {/* Contextual Selection Mini Toolbar (only when 1 node selected) */}
          {selectedNode && selectedNodePos && editor.selectedComponentIds.length === 1 ? (
            <SelectionToolbar
              onDelete={() => void deleteComponent(selectedNode.id)}
              onOpenInspector={() => onOpenInspector?.()}
              onRename={() => dispatch({ type: "node.edit", componentId: selectedNode.id })}
              onStartConnect={() =>
                handleStartConnect(selectedNode.id, {
                  x: selectedNodePos.x + NODE_WIDTH,
                  y: selectedNodePos.y + NODE_HEIGHT / 2,
                })
              }
              onSetTechnology={(technologyId) => void setTechnology(selectedNode.id, technologyId)}
              position={selectedNodePos}
              technologies={technologies.filter((technology) =>
                technology.capabilityIds.includes(selectedNode.capabilityId),
              )}
              technologyId={selectedNode.technologyId}
              zoom={editor.viewport.zoom}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
