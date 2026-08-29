"use client";

import { useRef } from "react";
import type { KeyboardEvent, PointerEvent } from "react";

import type { CanvasNodeProjection } from "@/features/editor";
import type { Position } from "@/domain/architecture";

import styles from "./canvas.module.css";

interface CanvasNodeProps {
  readonly node: CanvasNodeProjection;
  readonly position: Position;
  readonly selected: boolean;
  readonly zoom: number;
  readonly onSelect: () => void;
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

export function CanvasNode({
  node,
  position,
  selected,
  zoom,
  onSelect,
  onDraftPosition,
  onCommitPosition,
}: CanvasNodeProps) {
  const drag = useRef<DragState | null>(null);

  function handlePointerDown(event: PointerEvent<HTMLButtonElement>) {
    if (event.button !== 0) return;
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

  function handlePointerMove(event: PointerEvent<HTMLButtonElement>) {
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

  function handlePointerUp(event: PointerEvent<HTMLButtonElement>) {
    if (!drag.current || drag.current.pointerId !== event.pointerId) return;
    const finalPosition = drag.current.currentPosition;
    drag.current = null;
    void onCommitPosition(finalPosition);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
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

  return (
    <button
      type="button"
      className={styles.node}
      data-selected={selected || undefined}
      data-existing={node.existingInfrastructure || undefined}
      style={{ left: position.x, top: position.y }}
      aria-pressed={selected}
      aria-label={`${node.name}, ${node.capabilityId}`}
      onClick={onSelect}
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <span className={styles.nodeHeader}>
        <span className={styles.semanticMarker} aria-hidden="true" />
        <span className={styles.nodeName}>{node.name}</span>
        {node.existingInfrastructure ? (
          <span className={styles.existingBadge}>Existing</span>
        ) : null}
      </span>
      <span className={styles.capability}>{node.capabilityId}</span>
      {node.description ? (
        <span className={styles.description}>{node.description}</span>
      ) : null}
      {node.resolutionTrail.length > 0 ? (
        <span className={styles.resolutionTrail}>
          {node.resolutionTrail.join(" → ")}
        </span>
      ) : (
        <span className={styles.unresolved}>Provider-neutral</span>
      )}
    </button>
  );
}
