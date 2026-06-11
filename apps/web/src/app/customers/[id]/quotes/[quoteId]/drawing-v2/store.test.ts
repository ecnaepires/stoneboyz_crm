import { beforeEach, describe, expect, it } from "vitest";
import { drawingV2 } from "@stoneboyz/domain";
import { emptyLayoutV2, useDrawing } from "./store";

const rectPiece = () => {
  const outline = drawingV2.outlineFromRect(0, 0, 110, 25.5);
  return {
    pieceId: crypto.randomUUID(),
    kind: "countertop" as const,
    label: "Counter 1",
    positionIn: { x: 0, y: 0 },
    rotationDeg: 0 as const,
    outline,
    edges: [],
    cutouts: [],
  };
};

beforeEach(() => {
  useDrawing.getState().init(emptyLayoutV2());
});

describe("drawing store", () => {
  it("init replaces layout and clears history/selection/dirty", () => {
    const s = useDrawing.getState();
    s.commit({ ...s.layout, pieces: [rectPiece()] });
    useDrawing.getState().init(emptyLayoutV2());
    const after = useDrawing.getState();
    expect(after.layout.pieces).toHaveLength(0);
    expect(after.past).toHaveLength(0);
    expect(after.dirty).toBe(false);
    expect(after.selectedPieceIds).toEqual([]);
  });

  it("commit pushes history; undo/redo walk it; redo clears on new commit", () => {
    const s0 = useDrawing.getState();
    s0.commit({ ...s0.layout, pieces: [rectPiece()] });
    expect(useDrawing.getState().layout.pieces).toHaveLength(1);
    expect(useDrawing.getState().dirty).toBe(true);

    useDrawing.getState().undo();
    expect(useDrawing.getState().layout.pieces).toHaveLength(0);
    useDrawing.getState().redo();
    expect(useDrawing.getState().layout.pieces).toHaveLength(1);

    useDrawing.getState().undo();
    const s1 = useDrawing.getState();
    s1.commit({ ...s1.layout, pieces: [rectPiece(), rectPiece()] });
    expect(useDrawing.getState().future).toHaveLength(0); // redo branch dropped
  });

  it("caps history at 100 snapshots", () => {
    for (let i = 0; i < 120; i++) {
      const s = useDrawing.getState();
      s.commit({ ...s.layout, legend: [{ color: "#0000ff", label: `L${i}` }] });
    }
    expect(useDrawing.getState().past.length).toBe(100);
  });

  it("selection and tool state never enter history", () => {
    const s = useDrawing.getState();
    s.commit({ ...s.layout, pieces: [rectPiece()] });
    const id = useDrawing.getState().layout.pieces[0]!.pieceId;
    useDrawing.getState().select([id]);
    useDrawing.getState().setTool("draw");
    useDrawing.getState().undo();
    expect(useDrawing.getState().selectedPieceIds).toEqual([id]); // untouched by undo
    expect(useDrawing.getState().activeTool).toBe("draw");
  });

  it("markSaved clears dirty", () => {
    const s = useDrawing.getState();
    s.commit({ ...s.layout, pieces: [rectPiece()] });
    useDrawing.getState().markSaved();
    expect(useDrawing.getState().dirty).toBe(false);
  });
});
