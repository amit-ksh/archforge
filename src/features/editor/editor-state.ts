import type { EntityId, Position } from "@/domain/architecture";

export const MIN_ZOOM = 0.25;
export const MAX_ZOOM = 2.5;
export const ZOOM_STEP = 0.1;

export type EditorTool =
  | "select"
  | "pan"
  | "arrow"
  | "text"
  | string; // capability ID for placement (e.g. 'capability-web-interface', 'capability-api', etc.)

export interface ViewportState {
  readonly x: number;
  readonly y: number;
  readonly zoom: number;
}

export interface ConnectingState {
  readonly sourceComponentId: EntityId;
  readonly currentPos: Position;
}

export interface EditorState {
  readonly activeTool: EditorTool;
  readonly selectedComponentId: EntityId | null;
  readonly selectedComponentIds: readonly EntityId[];
  readonly selectedConnectionId: EntityId | null;
  readonly connecting: ConnectingState | null;
  readonly editingNodeId: EntityId | null;
  readonly editingConnectionId: EntityId | null;
  readonly viewport: ViewportState;
  readonly draftPositions: Readonly<Record<EntityId, Position>>;
}

export const initialEditorState: EditorState = {
  activeTool: "select",
  selectedComponentId: null,
  selectedComponentIds: [],
  selectedConnectionId: null,
  connecting: null,
  editingNodeId: null,
  editingConnectionId: null,
  viewport: { x: 80, y: 80, zoom: 1 },
  draftPositions: {},
};

export type EditorAction =
  | { readonly type: "tool.set"; readonly tool: EditorTool }
  | { readonly type: "component.select"; readonly componentId: EntityId | null }
  | { readonly type: "component.toggle-select"; readonly componentId: EntityId }
  | { readonly type: "component.select-all"; readonly componentIds: readonly EntityId[] }
  | { readonly type: "component.select-multiple"; readonly componentIds: readonly EntityId[] }
  | { readonly type: "connection.select"; readonly connectionId: EntityId | null }
  | {
      readonly type: "connect.start";
      readonly sourceComponentId: EntityId;
      readonly currentPos: Position;
    }
  | { readonly type: "connect.move"; readonly currentPos: Position }
  | { readonly type: "connect.end" }
  | { readonly type: "node.edit"; readonly componentId: EntityId | null }
  | { readonly type: "connection.edit"; readonly connectionId: EntityId | null }
  | { readonly type: "viewport.pan"; readonly dx: number; readonly dy: number }
  | { readonly type: "viewport.zoom"; readonly delta: number; readonly center?: Position }
  | { readonly type: "viewport.set-zoom"; readonly zoom: number }
  | { readonly type: "viewport.reset" }
  | {
      readonly type: "viewport.fit";
      readonly bounds: {
        minX: number;
        minY: number;
        maxX: number;
        maxY: number;
        viewportWidth: number;
        viewportHeight: number;
      };
    }
  | {
      readonly type: "position.draft";
      readonly componentId: EntityId;
      readonly position: Position;
    }
  | { readonly type: "position.clear"; readonly componentId: EntityId }
  | { readonly type: "selection.clear" };

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function editorReducer(
  state: EditorState,
  action: EditorAction,
): EditorState {
  switch (action.type) {
    case "tool.set":
      return {
        ...state,
        activeTool: action.tool,
        connecting: null,
        editingNodeId: null,
        editingConnectionId: null,
        selectedComponentId: action.tool !== "select" ? null : state.selectedComponentId,
        selectedComponentIds: action.tool !== "select" ? [] : state.selectedComponentIds,
        selectedConnectionId: action.tool !== "select" ? null : state.selectedConnectionId,
      };
    case "component.select":
      return {
        ...state,
        selectedComponentId: action.componentId,
        selectedComponentIds: action.componentId ? [action.componentId] : [],
        selectedConnectionId: null,
        editingNodeId: null,
        editingConnectionId: null,
        connecting: null,
      };
    case "component.toggle-select": {
      const exists = state.selectedComponentIds.includes(action.componentId);
      const nextIds = exists
        ? state.selectedComponentIds.filter((id) => id !== action.componentId)
        : [...state.selectedComponentIds, action.componentId];
      return {
        ...state,
        selectedComponentIds: nextIds,
        selectedComponentId: nextIds.length === 1 ? nextIds[0] : null,
        selectedConnectionId: null,
        editingNodeId: null,
        editingConnectionId: null,
      };
    }
    case "component.select-all":
      return {
        ...state,
        selectedComponentIds: action.componentIds,
        selectedComponentId: action.componentIds.length === 1 ? action.componentIds[0] : null,
        selectedConnectionId: null,
        editingNodeId: null,
        editingConnectionId: null,
      };
    case "component.select-multiple":
      return {
        ...state,
        selectedComponentIds: action.componentIds,
        selectedComponentId: action.componentIds.length === 1 ? action.componentIds[0] : null,
        selectedConnectionId: null,
        editingNodeId: null,
        editingConnectionId: null,
      };
    case "connection.select":
      return {
        ...state,
        selectedConnectionId: action.connectionId,
        selectedComponentId: null,
        selectedComponentIds: [],
        editingNodeId: null,
        editingConnectionId: null,
        connecting: null,
      };
    case "connect.start":
      return {
        ...state,
        connecting: {
          sourceComponentId: action.sourceComponentId,
          currentPos: action.currentPos,
        },
      };
    case "connect.move":
      if (!state.connecting) return state;
      return {
        ...state,
        connecting: {
          ...state.connecting,
          currentPos: action.currentPos,
        },
      };
    case "connect.end":
      return {
        ...state,
        connecting: null,
      };
    case "node.edit":
      return {
        ...state,
        editingNodeId: action.componentId,
        editingConnectionId: null,
      };
    case "connection.edit":
      return {
        ...state,
        editingConnectionId: action.connectionId,
        editingNodeId: null,
      };
    case "selection.clear":
      return {
        ...state,
        selectedComponentId: null,
        selectedComponentIds: [],
        selectedConnectionId: null,
        editingNodeId: null,
        editingConnectionId: null,
        connecting: null,
      };
    case "viewport.pan":
      return {
        ...state,
        viewport: {
          ...state.viewport,
          x: state.viewport.x + action.dx,
          y: state.viewport.y + action.dy,
        },
      };
    case "viewport.zoom": {
      const nextZoom = clamp(
        Number((state.viewport.zoom + action.delta).toFixed(2)),
        MIN_ZOOM,
        MAX_ZOOM,
      );
      if (action.center) {
        const scaleChange = nextZoom / state.viewport.zoom;
        const newX = action.center.x - (action.center.x - state.viewport.x) * scaleChange;
        const newY = action.center.y - (action.center.y - state.viewport.y) * scaleChange;
        return {
          ...state,
          viewport: { x: newX, y: newY, zoom: nextZoom },
        };
      }
      return {
        ...state,
        viewport: { ...state.viewport, zoom: nextZoom },
      };
    }
    case "viewport.set-zoom":
      return {
        ...state,
        viewport: {
          ...state.viewport,
          zoom: clamp(action.zoom, MIN_ZOOM, MAX_ZOOM),
        },
      };
    case "viewport.reset":
      return { ...state, viewport: initialEditorState.viewport };
    case "viewport.fit": {
      const { minX, minY, maxX, maxY, viewportWidth, viewportHeight } = action.bounds;
      const contentWidth = Math.max(maxX - minX + 240, 400);
      const contentHeight = Math.max(maxY - minY + 200, 300);
      const scaleX = (viewportWidth - 160) / contentWidth;
      const scaleY = (viewportHeight - 160) / contentHeight;
      const zoom = clamp(Number(Math.min(scaleX, scaleY).toFixed(2)), 0.4, 1.2);
      const centerX = (minX + maxX + 224) / 2;
      const centerY = (minY + maxY + 112) / 2;
      const x = viewportWidth / 2 - centerX * zoom;
      const y = viewportHeight / 2 - centerY * zoom;
      return {
        ...state,
        viewport: { x, y, zoom },
      };
    }
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
