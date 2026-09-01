"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

import type { Position } from "@/domain/architecture";
import type { CanvasNodeProjection } from "@/features/editor";

import styles from "./canvas.module.css";

interface CanvasNodeProps {
  readonly node: CanvasNodeProjection;
  readonly position: Position;
  readonly selected: boolean;
  readonly zoom: number;
  readonly isEditing?: boolean;
  readonly onSelect: () => void;
  readonly onStartConnect?: (portPosition: Position) => void;
  readonly onStartRename?: () => void;
  readonly onRename?: (newName: string) => Promise<void>;
  readonly onStopRename?: () => void;
  readonly onDraftPosition: (position: Position) => void;
  readonly onCommitPosition: (position: Position) => Promise<void>;
}

interface DragState {
  readonly pointerId: number;
  readonly startClientX: number;
  readonly startClientY: number;
  readonly startPosition: Position;
  currentPosition: Position;
}

const KEYBOARD_MOVE = 16;
const NODE_WIDTH = 224;
const NODE_HEIGHT = 110;

function capabilityColor(capabilityId: string): string {
  if (capabilityId.includes("database")) return "var(--status-success)";
  if (capabilityId.includes("cache")) return "var(--status-warning)";
  if (capabilityId.includes("queue") || capabilityId.includes("stream")) return "var(--semantic-technology)";
  if (capabilityId.includes("interface")) return "var(--interactive)";
  if (capabilityId.includes("api")) return "var(--semantic-capability)";
  if (capabilityId.includes("storage")) return "var(--status-info)";
  if (capabilityId.includes("identity")) return "var(--semantic-ai)";
  return "var(--semantic-capability)";
}

function capabilityShortName(capabilityId: string): string {
  return capabilityId
    .replace(/^capability-/, "")
    .replaceAll("-", " ")
    .toUpperCase();
}

export function CanvasNode({
  node,
  position,
  selected,
  zoom,
  isEditing = false,
  onSelect,
  onStartConnect,
  onStartRename,
  onRename,
  onStopRename,
  onDraftPosition,
  onCommitPosition,
}: CanvasNodeProps) {
  const drag = useRef<DragState | null>(null);
  const [prevName, setPrevName] = useState(node.name);
  const [draftName, setDraftName] = useState(node.name);

  if (node.name !== prevName) {
    setPrevName(node.name);
    setDraftName(node.name);
  }

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || isEditing) return;
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLButtonElement) {
      return;
    }
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startPosition: position,
      currentPosition: position,
    };
    onSelect();
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!drag.current || drag.current.pointerId !== event.pointerId) return;
    const next = {
      x:
        drag.current.startPosition.x +
        (event.clientX - drag.current.startClientX) / zoom,
      y:
        drag.current.startPosition.y +
        (event.clientY - drag.current.startClientY) / zoom,
    };
    drag.current.currentPosition = next;
    onDraftPosition(next);
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    if (!drag.current || drag.current.pointerId !== event.pointerId) return;
    const finalPosition = drag.current.currentPosition;
    drag.current = null;
    void onCommitPosition(finalPosition);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (isEditing) return;
    const delta = {
      ArrowLeft: { x: -KEYBOARD_MOVE, y: 0 },
      ArrowRight: { x: KEYBOARD_MOVE, y: 0 },
      ArrowUp: { x: 0, y: -KEYBOARD_MOVE },
      ArrowDown: { x: 0, y: KEYBOARD_MOVE },
    }[event.key];
    if (!delta) return;
    event.preventDefault();
    void onCommitPosition({
      x: position.x + delta.x,
      y: position.y + delta.y,
    });
  }

  function handlePortPointerDown(e: PointerEvent<HTMLButtonElement>, side: "top" | "right" | "bottom" | "left") {
    e.stopPropagation();
    let portPos = { x: position.x + NODE_WIDTH, y: position.y + NODE_HEIGHT / 2 };
    if (side === "top") portPos = { x: position.x + NODE_WIDTH / 2, y: position.y };
    if (side === "bottom") portPos = { x: position.x + NODE_WIDTH / 2, y: position.y + NODE_HEIGHT };
    if (side === "left") portPos = { x: position.x, y: position.y + NODE_HEIGHT / 2 };

    onSelect();
    onStartConnect?.(portPos);
  }

  function handleNameBlur() {
    if (draftName.trim() && draftName !== node.name) {
      void onRename?.(draftName.trim());
    }
    onStopRename?.();
  }

  function handleNameKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleNameBlur();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setDraftName(node.name);
      onStopRename?.();
    }
  }

  const dotColor = capabilityColor(node.capabilityId);

  return (
    <div
      className={styles.node}
      data-selected={selected || undefined}
      data-existing={node.existingInfrastructure || undefined}
      style={{ left: position.x, top: position.y }}
      aria-label={`${node.name}, ${node.capabilityId}`}
      tabIndex={0}
      onClick={onSelect}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onStartRename?.();
      }}
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* 4 Interactive Drag-to-Connect Handles */}
      <button
        type="button"
        className={`${styles.nodePort} ${styles.portTop}`}
        title="Drag to connect"
        aria-label="Connect from top"
        onPointerDown={(e) => handlePortPointerDown(e, "top")}
      >
        <span className={styles.portDot} />
      </button>
      <button
        type="button"
        className={`${styles.nodePort} ${styles.portRight}`}
        title="Drag to connect"
        aria-label="Connect from right"
        onPointerDown={(e) => handlePortPointerDown(e, "right")}
      >
        <span className={styles.portDot} />
      </button>
      <button
        type="button"
        className={`${styles.nodePort} ${styles.portBottom}`}
        title="Drag to connect"
        aria-label="Connect from bottom"
        onPointerDown={(e) => handlePortPointerDown(e, "bottom")}
      >
        <span className={styles.portDot} />
      </button>
      <button
        type="button"
        className={`${styles.nodePort} ${styles.portLeft}`}
        title="Drag to connect"
        aria-label="Connect from left"
        onPointerDown={(e) => handlePortPointerDown(e, "left")}
      >
        <span className={styles.portDot} />
      </button>

      {/* Node Header */}
      <div className={styles.nodeHeader}>
        <span
          className={styles.semanticMarker}
          style={{ backgroundColor: dotColor }}
          aria-hidden="true"
        />
        <div className={styles.nameContainer}>
          {isEditing ? (
            <input
              autoFocus
              className={styles.inlineNameInput}
              onBlur={handleNameBlur}
              onChange={(e) => setDraftName(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              onFocus={(e) => e.target.select()}
              onKeyDown={handleNameKeyDown}
              onPointerDown={(e) => e.stopPropagation()}
              placeholder="Component name..."
              ref={inputRef}
              value={draftName}
            />
          ) : (
            <span className={styles.nodeName} title={node.name}>
              {node.name}
            </span>
          )}
        </div>
        {node.existingInfrastructure ? (
          <span className={styles.existingBadge} title="Existing system infrastructure">
            Existing
          </span>
        ) : null}
      </div>

      {/* Capability Tag */}
      <div className={styles.capabilityRow}>
        <span className={styles.capabilityBadge}>
          {capabilityShortName(node.capabilityId)}
        </span>
      </div>

      {/* Description or Resolution status */}
      {node.description ? (
        <p className={styles.description}>{node.description}</p>
      ) : null}

      {/* Resolution Trail */}
      <div className={styles.nodeFooter}>
        {node.technologyId ? (
          <span className={styles.resolvedTech}>
            ⚡ {node.technologyId.replace("technology-", "")}
          </span>
        ) : (
          <span className={styles.unresolved}>Provider-neutral</span>
        )}
      </div>
    </div>
  );
}
