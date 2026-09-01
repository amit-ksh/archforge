"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import type { Position } from "@/domain/architecture";
import type { CanvasConnectionProjection } from "@/features/editor";

import styles from "./canvas.module.css";

const NODE_WIDTH = 224;
const NODE_HEIGHT = 110;

interface CanvasConnectionProps {
  readonly connection: CanvasConnectionProjection;
  readonly sourcePos: Position;
  readonly targetPos: Position;
  readonly selected: boolean;
  readonly isEditing: boolean;
  readonly markerId: string;
  readonly onSelect: () => void;
  readonly onUpdateLabel: (newLabel: string) => void;
  readonly onStartEditing: () => void;
  readonly onStopEditing: () => void;
}

/**
 * Calculates optimal port positions for two rectangular nodes
 */
function getConnectorEndpoints(source: Position, target: Position) {
  const srcCenter = { x: source.x + NODE_WIDTH / 2, y: source.y + NODE_HEIGHT / 2 };
  const tgtCenter = { x: target.x + NODE_WIDTH / 2, y: target.y + NODE_HEIGHT / 2 };

  const dx = tgtCenter.x - srcCenter.x;
  const dy = tgtCenter.y - srcCenter.y;

  let x1 = source.x + NODE_WIDTH;
  let y1 = source.y + NODE_HEIGHT / 2;
  let x2 = target.x;
  let y2 = target.y + NODE_HEIGHT / 2;

  // Determine relative orientation
  if (Math.abs(dx) > Math.abs(dy)) {
    // Left-to-right or Right-to-left
    if (dx > 0) {
      x1 = source.x + NODE_WIDTH;
      y1 = source.y + NODE_HEIGHT / 2;
      x2 = target.x;
      y2 = target.y + NODE_HEIGHT / 2;
    } else {
      x1 = source.x;
      y1 = source.y + NODE_HEIGHT / 2;
      x2 = target.x + NODE_WIDTH;
      y2 = target.y + NODE_HEIGHT / 2;
    }
  } else {
    // Top-to-bottom or Bottom-to-top
    if (dy > 0) {
      x1 = source.x + NODE_WIDTH / 2;
      y1 = source.y + NODE_HEIGHT;
      x2 = target.x + NODE_WIDTH / 2;
      y2 = target.y;
    } else {
      x1 = source.x + NODE_WIDTH / 2;
      y1 = source.y;
      x2 = target.x + NODE_WIDTH / 2;
      y2 = target.y + NODE_HEIGHT;
    }
  }

  return { x1, y1, x2, y2 };
}

export function CanvasConnection({
  connection,
  sourcePos,
  targetPos,
  selected,
  isEditing,
  markerId,
  onSelect,
  onUpdateLabel,
  onStartEditing,
  onStopEditing,
}: CanvasConnectionProps) {
  const { x1, y1, x2, y2 } = getConnectorEndpoints(sourcePos, targetPos);
  const [prevLabel, setPrevLabel] = useState(connection.label);
  const [draftLabel, setDraftLabel] = useState(connection.label);

  if (connection.label !== prevLabel) {
    setPrevLabel(connection.label);
    setDraftLabel(connection.label);
  }

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;

  // Bezier curve control points
  const dx = Math.abs(x2 - x1);
  const dy = Math.abs(y2 - y1);
  const bend = Math.max(36, Math.min(100, Math.max(dx, dy) * 0.4));
  
  // Decide whether curve is horizontal or vertical bend
  let path = `M ${x1} ${y1} L ${x2} ${y2}`;
  if (dx > dy) {
    const cx1 = x1 + (x2 > x1 ? bend : -bend);
    const cx2 = x2 + (x2 > x1 ? -bend : bend);
    path = `M ${x1} ${y1} C ${cx1} ${y1}, ${cx2} ${y2}, ${x2} ${y2}`;
  } else {
    const cy1 = y1 + (y2 > y1 ? bend : -bend);
    const cy2 = y2 + (y2 > y1 ? -bend : bend);
    path = `M ${x1} ${y1} C ${x1} ${cy1}, ${x2} ${cy2}, ${x2} ${y2}`;
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      onUpdateLabel(draftLabel);
      onStopEditing();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setDraftLabel(connection.label);
      onStopEditing();
    }
  }

  function handleBlur() {
    if (draftLabel !== connection.label) onUpdateLabel(draftLabel);
    onStopEditing();
  }

  function handleLabelKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect();
      onStartEditing();
    }
  }

  return (
    <g
      className={`${styles.connectionGroup} ${selected ? styles.connectionSelected : ""}`}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      {/* Invisible hit area path for easy clicking */}
      <path
        className={styles.connectionHitArea}
        d={path}
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
      />

      {/* Main visible connection path */}
      <path
        className={styles.connectionPath}
        d={path}
        markerEnd={`url(#${markerId}${selected ? "-selected" : ""})`}
      />

      {/* Label and interactive pill */}
      <foreignObject
        x={midX - 70}
        y={midY - 16}
        width={140}
        height={32}
        className={styles.connectionLabelContainer}
      >
        <div
          className={`${styles.connectionLabelPill} ${selected ? styles.connectionLabelPillSelected : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
            onStartEditing();
          }}
          onKeyDown={handleLabelKeyDown}
          onPointerDown={(e) => e.stopPropagation()}
          role="button"
          tabIndex={0}
          title="Edit connection label"
        >
          {isEditing ? (
            <input
              autoFocus
              className={styles.connectionLabelInput}
              onBlur={handleBlur}
              onChange={(e) => setDraftLabel(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              onFocus={(e) => e.target.select()}
              onKeyDown={handleKeyDown}
              onPointerDown={(e) => e.stopPropagation()}
              placeholder="Label..."
              ref={inputRef}
              value={draftLabel}
            />
          ) : (
            <span className={styles.connectionLabelText}>
              {connection.label || connection.relationship}
            </span>
          )}
        </div>
      </foreignObject>
    </g>
  );
}
