import { create } from "zustand";
import type { drawingV2 } from "@stoneboyz/domain";

type LayoutV2 = drawingV2.LayoutV2;

export const TOOL_IDS = ["select", "draw", "distance"] as const;
export type ToolId = (typeof TOOL_IDS)[number];

export const KITCHEN_DEPTH_IN = 25.5;
export const BATH_DEPTH_IN = 22.5;
const HISTORY_CAP = 100;

export function emptyLayoutV2(): LayoutV2 {
  return { schemaVersion: 2, pieces: [], sinks: [], annotations: [], legend: [] };
}

interface DrawingStore {
  layout: LayoutV2;
  past: LayoutV2[];
  future: LayoutV2[];
  dirty: boolean;
  selectedPieceIds: string[];
  activeTool: ToolId;
  depthIn: number;
  dimsVisible: boolean;

  init: (layout: LayoutV2) => void;
  commit: (next: LayoutV2) => void;
  undo: () => void;
  redo: () => void;
  markSaved: () => void;
  select: (ids: string[]) => void;
  setTool: (t: ToolId) => void;
  setDepth: (v: number) => void;
  toggleDims: () => void;
}

export const useDrawing = create<DrawingStore>((set, get) => ({
  layout: emptyLayoutV2(),
  past: [],
  future: [],
  dirty: false,
  selectedPieceIds: [],
  activeTool: "select",
  depthIn: KITCHEN_DEPTH_IN,
  dimsVisible: true,

  init: (layout) =>
    set({ layout, past: [], future: [], dirty: false, selectedPieceIds: [] }),

  commit: (next) => {
    const { layout, past } = get();
    set({
      layout: next,
      past: [...past.slice(-(HISTORY_CAP - 1)), structuredClone(layout)],
      future: [],
      dirty: true,
    });
  },

  undo: () => {
    const { past, future, layout } = get();
    const prev = past[past.length - 1];
    if (!prev) return;
    set({
      layout: prev,
      past: past.slice(0, -1),
      future: [structuredClone(layout), ...future],
      dirty: true,
    });
  },

  redo: () => {
    const { past, future, layout } = get();
    const next = future[0];
    if (!next) return;
    set({
      layout: next,
      past: [...past, structuredClone(layout)],
      future: future.slice(1),
      dirty: true,
    });
  },

  markSaved: () => set({ dirty: false }),
  select: (ids) => set({ selectedPieceIds: ids }),
  setTool: (t) => set({ activeTool: t }),
  setDepth: (v) => set({ depthIn: v }),
  toggleDims: () => set((s) => ({ dimsVisible: !s.dimsVisible })),
}));
