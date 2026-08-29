import type { EntityId, Position } from "@/domain/architecture";

export const MIN_ZOOM = 0.4;
export const MAX_ZOOM = 2;
export const ZOOM_STEP = 0.1;

export interface ViewportState {
  readonly x: number;
  readonly y: number;
  readonly zoom: number;
}

export interface EditorState {
  readonly selectedComponentId: EntityId | null;
  readonly viewport: ViewportState;
  readonly draftPositions: Readonly<Record<EntityId, Position>>;
}

export const initialEditorState: EditorState = {
  selectedComponentId: null,
  viewport: { x: 32, y: 32, zoom: 1 },
  draftPositions: {},
};

export type EditorAction =
  | { readonly type: "component.select"; readonly componentId: EntityId | null }
  | { readonly type: "viewport.pan"; readonly dx: number; readonly dy: number }
  | { readonly type: "viewport.zoom"; readonly delta: number }
  | { readonly type: "viewport.reset" }
  | {
      readonly type: "position.draft";
      readonly componentId: EntityId;
      readonly position: Position;
    }
  | { readonly type: "position.clear"; readonly componentId: EntityId };

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function editorReducer(
  state: EditorState,
  action: EditorAction,
): EditorState {
  switch (action.type) {
    case "component.select":
      return { ...state, selectedComponentId: action.componentId };
    case "viewport.pan":
      return {
        ...state,
        viewport: {
          ...state.viewport,
          x: state.viewport.x + action.dx,
          y: state.viewport.y + action.dy,
        },
      };
    case "viewport.zoom":
      return {
        ...state,
        viewport: {
          ...state.viewport,
          zoom: clamp(
            Number((state.viewport.zoom + action.delta).toFixed(2)),
            MIN_ZOOM,
            MAX_ZOOM,
          ),
        },
      };
    case "viewport.reset":
      return { ...state, viewport: initialEditorState.viewport };
    case "position.draft":
      return {
        ...state,
        draftPositions: {
          ...state.draftPositions,
          [action.componentId]: action.position,
        },
      };
    case "position.clear": {
      const draftPositions = { ...state.draftPositions };
      delete draftPositions[action.componentId];
      return { ...state, draftPositions };
    }
  }
}
