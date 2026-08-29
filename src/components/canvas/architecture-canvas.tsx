"use client";

import { useId, useMemo, useReducer, useRef, useState } from "react";
import type { PointerEvent } from "react";

import type { ArchitectureCommand } from "@/application/commands";
import type { Architecture, EntityId, Position } from "@/domain/architecture";
import {
  ZOOM_STEP,
  editorReducer,
  initialEditorState,
  projectArchitecture,
} from "@/features/editor";

import { CanvasNode } from "./canvas-node";
import styles from "./canvas.module.css";

const WORLD_SIZE = 4000;
const NODE_WIDTH = 224;
const NODE_HEIGHT = 112;

export interface ArchitectureCanvasProps {
  readonly architecture: Architecture;
  readonly dispatchCommand: (command: ArchitectureCommand) => Promise<void>;
}

interface PanState {
  readonly pointerId: number;
  clientX: number;
  clientY: number;
}

export function ArchitectureCanvas({
  architecture,
  dispatchCommand,
}: ArchitectureCanvasProps) {
  const projection = useMemo(
    () => projectArchitecture(architecture),
    [architecture],
  );
  const [editor, dispatch] = useReducer(editorReducer, initialEditorState);
  const [error, setError] = useState<string | null>(null);
  const pan = useRef<PanState | null>(null);
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

  function handleCanvasPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    if (event.target instanceof Element && event.target.closest("button")) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    pan.current = {
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
    };
    dispatch({ type: "component.select", componentId: null });
  }

  function handleCanvasPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!pan.current || pan.current.pointerId !== event.pointerId) return;
    const dx = event.clientX - pan.current.clientX;
    const dy = event.clientY - pan.current.clientY;
    pan.current.clientX = event.clientX;
    pan.current.clientY = event.clientY;
    dispatch({ type: "viewport.pan", dx, dy });
  }

  function handleCanvasPointerUp(event: PointerEvent<HTMLDivElement>) {
    if (pan.current?.pointerId === event.pointerId) pan.current = null;
  }

  return (
    <section className={styles.canvasShell} aria-label="Architecture canvas">
      <div className={styles.toolbar} aria-label="Canvas controls">
        <button
          type="button"
          onClick={() => dispatch({ type: "viewport.zoom", delta: -ZOOM_STEP })}
          aria-label="Zoom out"
        >
          −
        </button>
        <output aria-label="Canvas zoom">
          {Math.round(editor.viewport.zoom * 100)}%
        </output>
        <button
          type="button"
          onClick={() => dispatch({ type: "viewport.zoom", delta: ZOOM_STEP })}
          aria-label="Zoom in"
        >
          +
        </button>
        <button
          type="button"
          onClick={() => dispatch({ type: "viewport.reset" })}
        >
          Reset view
        </button>
      </div>

      {error ? (
        <div className={styles.error} role="alert">
          {error}
        </div>
      ) : null}

      <div
        className={styles.canvas}
        onPointerDown={handleCanvasPointerDown}
        onPointerMove={handleCanvasPointerMove}
        onPointerUp={handleCanvasPointerUp}
      >
        {projection.nodes.length === 0 ? (
          <div className={styles.emptyState}>
            <strong>Your architecture is ready for its first capability.</strong>
            <span>Add a semantic component to begin mapping the system.</span>
          </div>
        ) : null}

        <div
          className={styles.world}
          style={{
            width: WORLD_SIZE,
            height: WORLD_SIZE,
            transform: `translate(${editor.viewport.x}px, ${editor.viewport.y}px) scale(${editor.viewport.zoom})`,
          }}
          aria-hidden={projection.nodes.length === 0 || undefined}
        >
          <svg
            className={styles.connections}
            width={WORLD_SIZE}
            height={WORLD_SIZE}
            aria-label="Architecture connections"
          >
            <defs>
              <marker
                id={markerId}
                markerWidth="8"
                markerHeight="8"
                refX="7"
                refY="4"
                orient="auto"
              >
                <path d="M0,0 L8,4 L0,8 Z" />
              </marker>
            </defs>
            {projection.connections.map((connection) => {
              const source = positionFor(connection.sourceComponentId);
              const target = positionFor(connection.targetComponentId);
              if (!source || !target) return null;
              const x1 = source.x + NODE_WIDTH;
              const y1 = source.y + NODE_HEIGHT / 2;
              const x2 = target.x;
              const y2 = target.y + NODE_HEIGHT / 2;
              const bend = Math.max(48, Math.abs(x2 - x1) / 2);
              const path = `M ${x1} ${y1} C ${x1 + bend} ${y1}, ${x2 - bend} ${y2}, ${x2} ${y2}`;
              return (
                <g key={connection.id}>
                  <path
                    className={styles.connectionPath}
                    d={path}
                    markerEnd={`url(#${markerId})`}
                  />
                  {connection.label ? (
                    <text
                      className={styles.connectionLabel}
                      x={(x1 + x2) / 2}
                      y={(y1 + y2) / 2 - 8}
                      textAnchor="middle"
                    >
                      {connection.label}
                    </text>
                  ) : null}
                </g>
              );
            })}
          </svg>

          {projection.nodes.map((node) => (
            <CanvasNode
              key={node.id}
              node={node}
              position={positionFor(node.id) ?? node.position}
              selected={editor.selectedComponentId === node.id}
              zoom={editor.viewport.zoom}
              onSelect={() =>
                dispatch({ type: "component.select", componentId: node.id })
              }
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
        </div>
      </div>
    </section>
  );
}
