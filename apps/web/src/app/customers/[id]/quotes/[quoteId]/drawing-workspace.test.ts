import { describe, expect, it } from "vitest";
import { measurementTotalsFromLayout } from "@stoneboyz/domain";
import {
  DEFAULT_DRAWING_MARKUP_COLOR,
  DRAWING_MARKUP_COLORS,
} from "./drawing-colors";
import {
  DRAWING_CENTERLINE_OFFSET_DIRECTIONS,
  DRAWING_FILLET_MODE_LABELS,
  DRAWING_FILLET_SIZE_PRESETS,
  DRAWING_LAYOUT_HISTORY_LIMIT,
  DRAWING_ZOOM_MAX,
  DRAWING_ZOOM_MIN,
  DRAWING_ZOOM_STEP,
  DRAWING_OFFSET_MODE_LABELS,
  DRAWING_SEGMENT_DEFAULT_LENGTH_IN,
  DRAWING_SEGMENT_DIRECTION_OPTIONS,
  DRAWING_SHEET_TAB_DELETE_LABEL,
  DRAWING_WORKSPACE_TOOL_LABELS,
  DRAWING_WORKSPACE_REMOVED_STEP_LABELS,
  DRAWING_WORKSPACE_TOP_ACTION_LABELS,
  DRAWING_WORKSPACE_BOTTOM_STRIP_ROLE,
  DRAWING_WORKSPACE_ACTIVE_SHEET_CLASS,
  DRAWING_WORKSPACE_TOOL_PANEL_CLASS,
  DRAWING_ROUNDED_PIECE_BODY_LISTENING,
  drawingCenterlineOffsetDirectionsForLine,
  drawingCenterlinePlacementModeForOffsetMode,
  drawingCommitLayoutHistory,
  drawingDraggedPositionFromCanvasPoints,
  drawingCanvasPointFromScreenPoint,
  drawingCornerForAdjacentEdges,
  drawingDirectCenterlineForRectangle,
  drawingRedoLayoutHistory,
  drawingZoomAtCanvasPoint,
  drawingZoomIn,
  drawingZoomAroundScreenPoint,
  drawingZoomOut,
  drawingPreviewShowsBoundingDimensions,
  drawingCenterlineOffsetDirectionForPoint,
  drawingPaintedEdgeId,
  drawingCornerTreatmentForFilletMode,
  drawingFilletModeRequiresValue,
  drawingLayoutWithRectangleMeasurementShapes,
  drawingSheetTabCanDelete,
  drawingSheetTabMenuPosition,
  drawingReferenceLineStrokeWidth,
  drawingUndoLayoutHistory,
} from "./drawing-workspace";

describe("drawing workspace contract", () => {
  it("uses field tool labels instead of the retired wizard/pricing steps", () => {
    expect(DRAWING_WORKSPACE_TOOL_LABELS).toEqual([
      "Counter",
      "Back Splash",
      "Sink",
      "Faucet",
      "Edge",
      "Color",
    ]);
    expect(DRAWING_WORKSPACE_REMOVED_STEP_LABELS).toContain("Price Details");
    expect(DRAWING_WORKSPACE_TOOL_LABELS).not.toContain("Price Details");
  });

  it("uses one shared color config for paint tools and legends", () => {
    expect(DRAWING_MARKUP_COLORS).toEqual([
      { id: "wall", name: "Wall", color: "#dc2626" },
      { id: "edge", name: "Edge", color: "#2563eb" },
      { id: "stove", name: "Stove", color: "#f1ee00" },
      { id: "fridge", name: "Fridge", color: "#ec0eec" },
      { id: "window", name: "Window", color: "#52ee09" },
      { id: "default", name: "Default", color: "#2b2b2c" },
    ]);
    expect(DEFAULT_DRAWING_MARKUP_COLOR).toBe(DRAWING_MARKUP_COLORS[0]?.color);
  });

  it("keeps reset in the top toolbar and reserves the bottom strip for Sheets", () => {
    expect(DRAWING_WORKSPACE_TOP_ACTION_LABELS).toContain("Reset Layout");
    expect(DRAWING_WORKSPACE_BOTTOM_STRIP_ROLE).toBe("sheets");
  });

  it("labels the Sheet tab delete action and blocks deleting the last Sheet", () => {
    expect(DRAWING_SHEET_TAB_DELETE_LABEL).toBe("Delete Area");
    expect(drawingSheetTabCanDelete(2)).toBe(true);
    expect(drawingSheetTabCanDelete(1)).toBe(false);
  });

  it("keeps the Sheet tab menu inside the viewport", () => {
    expect(
      drawingSheetTabMenuPosition({
        clickX: 790,
        clickY: 590,
        viewportWidth: 800,
        viewportHeight: 600,
      }),
    ).toEqual({ x: 656, y: 552 });
  });

  it("stretches the active Sheet canvas down to the Sheet tabs", () => {
    expect(DRAWING_WORKSPACE_ACTIVE_SHEET_CLASS).toContain("flex");
    expect(DRAWING_WORKSPACE_ACTIVE_SHEET_CLASS).toContain("flex-col");
    expect(DRAWING_WORKSPACE_ACTIVE_SHEET_CLASS).toContain("flex-1");
    expect(DRAWING_WORKSPACE_ACTIVE_SHEET_CLASS).toContain("min-h-0");
  });

  it("makes the tool panel scroll without burying tools", () => {
    expect(DRAWING_WORKSPACE_TOOL_PANEL_CLASS).toContain("overflow-y-auto");
    expect(DRAWING_WORKSPACE_TOOL_PANEL_CLASS).toContain("min-h-0");
    expect(DRAWING_WORKSPACE_TOOL_PANEL_CLASS).toContain("shrink-0");
  });

  it("keeps deep undo history and clears redo after a new edit", () => {
    const layouts = Array.from({ length: DRAWING_LAYOUT_HISTORY_LIMIT + 5 }, (_, index) => ({
      revision: index,
    }));
    const history = layouts.slice(1).reduce<{
      past: Array<{ revision: number }>;
      future: Array<{ revision: number }>;
    }>(
      (currentHistory, layout, index) =>
        drawingCommitLayoutHistory({
          history: currentHistory,
          previousLayout: layouts[index]!,
          nextLayout: layout,
        }),
      { past: [], future: [{ revision: 999 }] },
    );

    expect(history.past).toHaveLength(DRAWING_LAYOUT_HISTORY_LIMIT);
    expect(history.past[0]).toEqual({ revision: 4 });
    expect(history.past.at(-1)).toEqual({ revision: 103 });
    expect(history.future).toEqual([]);
  });

  it("moves layouts between past and future for undo and redo", () => {
    const history = {
      past: [{ revision: 1 }, { revision: 2 }],
      future: [{ revision: 4 }],
    };

    const undone = drawingUndoLayoutHistory({
      history,
      currentLayout: { revision: 3 },
    });
    expect(undone?.layout).toEqual({ revision: 2 });
    expect(undone?.history).toEqual({
      past: [{ revision: 1 }],
      future: [{ revision: 3 }, { revision: 4 }],
    });

    const redone = undone
      ? drawingRedoLayoutHistory({
          history: undone.history,
          currentLayout: undone.layout,
        })
      : null;
    expect(redone?.layout).toEqual({ revision: 3 });
    expect(redone?.history).toEqual({
      past: [{ revision: 1 }, { revision: 2 }],
      future: [{ revision: 4 }],
    });
  });

  it("zooms in and out with the workspace zoom bounds", () => {
    expect(drawingZoomIn(1)).toBe(1 + DRAWING_ZOOM_STEP);
    expect(drawingZoomOut(1)).toBe(1 - DRAWING_ZOOM_STEP);
    expect(drawingZoomIn(DRAWING_ZOOM_MAX)).toBe(DRAWING_ZOOM_MAX);
    expect(drawingZoomOut(DRAWING_ZOOM_MIN)).toBe(DRAWING_ZOOM_MIN);
  });

  it("keeps the cursor anchored while wheel zoom changes the viewport", () => {
    expect(
      drawingZoomAroundScreenPoint({
        screenPoint: { x: 200, y: 120 },
        pan: { x: 20, y: 10 },
        zoom: 1,
        zoomAction: drawingZoomIn,
      }),
    ).toEqual({
      zoom: 1 + DRAWING_ZOOM_STEP,
      pan: { x: -7, y: -6.5 },
    });
  });

  it("zooms toolbar and hotkey actions toward a chosen canvas focus point", () => {
    expect(
      drawingZoomAtCanvasPoint({
        canvasPoint: { x: 120, y: 80 },
        screenPoint: { x: 300, y: 200 },
        pan: { x: 0, y: 0 },
        zoom: 1,
        nextZoom: drawingZoomIn(1),
      }),
    ).toEqual({
      zoom: 1 + DRAWING_ZOOM_STEP,
      pan: { x: 162, y: 108 },
    });
  });

  it("moves dragged pieces by canvas distance after zoom", () => {
    const start = drawingCanvasPointFromScreenPoint({
      point: { x: 260, y: 160 },
      pan: { x: 20, y: 10 },
      zoom: 2,
    });
    const current = drawingCanvasPointFromScreenPoint({
      point: { x: 320, y: 190 },
      pan: { x: 20, y: 10 },
      zoom: 2,
    });

    expect(
      drawingDraggedPositionFromCanvasPoints({
        origin: { x: 40, y: 50 },
        start,
        current,
      }),
    ).toEqual({ x: 70, y: 65 });
  });

  it("identifies painted edges by exact segment coordinates", () => {
    const upperLeft = drawingPaintedEdgeId("piece-1", {
      from: [0, 0],
      to: [0, 25],
    });
    const lowerLeft = drawingPaintedEdgeId("piece-1", {
      from: [0, 100],
      to: [0, 125],
    });
    const reversedUpperLeft = drawingPaintedEdgeId("piece-1", {
      from: [0, 25],
      to: [0, 0],
    });

    expect(upperLeft).not.toBe(lowerLeft);
    expect(upperLeft).toBe(reversedUpperLeft);
  });

  it("hides bounding-box dimensions while drawing a segmented chain preview", () => {
    expect(drawingPreviewShowsBoundingDimensions(0)).toBe(true);
    expect(drawingPreviewShowsBoundingDimensions(1)).toBe(true);
    expect(drawingPreviewShowsBoundingDimensions(2)).toBe(false);
    expect(drawingPreviewShowsBoundingDimensions(4)).toBe(false);
  });

  it("measures simple rectangular canvas pieces that do not have a complex shape", () => {
    const layout = drawingLayoutWithRectangleMeasurementShapes(
      {
        pieces: [
          { pieceId: "counter-1", x: 0, y: 0, rotation: 0, shape: null },
        ],
        sinks: [],
        corners: [],
        edges: [],
        paintedEdges: [],
        referenceLines: [],
        deletedLines: [],
      },
      [{ id: "counter-1", lengthIn: 96, widthIn: 25.5 }],
    );

    expect(measurementTotalsFromLayout(layout).countertopSqFt).toBe(17);
  });

  it("offers cardinal centerline offset directions", () => {
    expect(DRAWING_CENTERLINE_OFFSET_DIRECTIONS).toEqual([
      "left",
      "right",
      "up",
      "down",
    ]);
  });

  it("offers separate offset modes for edges and centerlines", () => {
    expect(DRAWING_OFFSET_MODE_LABELS).toEqual([
      "Offset Edge",
      "Offset Centerline",
    ]);
  });

  it("offers the segment direction picker options and default length", () => {
    expect(DRAWING_SEGMENT_DEFAULT_LENGTH_IN).toBe(10);
    expect(DRAWING_SEGMENT_DIRECTION_OPTIONS).toEqual([
      { value: "upLeft", label: "↖", title: "Up left" },
      { value: "up", label: "↑", title: "Up" },
      { value: "upRight", label: "↗", title: "Up right" },
      { value: "left", label: "←", title: "Left" },
      { value: "right", label: "→", title: "Right" },
      { value: "downLeft", label: "↙", title: "Down left" },
      { value: "down", label: "↓", title: "Down" },
      { value: "downRight", label: "↘", title: "Down right" },
    ]);
  });

  it("offers fillet modes with common inch presets", () => {
    expect(DRAWING_FILLET_MODE_LABELS).toEqual([
      "Radius",
      "Chamfer",
      "Sharp",
    ]);
    expect(DRAWING_FILLET_SIZE_PRESETS).toEqual([1, 1.5, 2, 2.5, 3, 3.5, 4]);
  });

  it("maps fillet modes onto saved corner treatments", () => {
    expect(drawingCornerTreatmentForFilletMode("Radius")).toBe("radius");
    expect(drawingCornerTreatmentForFilletMode("Chamfer")).toBe("clip");
    expect(drawingCornerTreatmentForFilletMode("Sharp")).toBe("none");
  });

  it("requires a size for radius and chamfer but not sharp", () => {
    expect(drawingFilletModeRequiresValue("Radius")).toBe(true);
    expect(drawingFilletModeRequiresValue("Chamfer")).toBe(true);
    expect(drawingFilletModeRequiresValue("Sharp")).toBe(false);
  });

  it("keeps rounded pieces selectable after radius treatments", () => {
    expect(DRAWING_ROUNDED_PIECE_BODY_LISTENING).toBe(true);
  });

  it("keeps plain green reference outlines the same thin weight as piece outlines", () => {
    expect(
      drawingReferenceLineStrokeWidth({
        paintActive: false,
        active: false,
        hovered: false,
        centerlineSource: false,
      }),
    ).toBe(1);
    expect(
      drawingReferenceLineStrokeWidth({
        paintActive: false,
        active: false,
        hovered: true,
        centerlineSource: false,
      }),
    ).toBe(2);
    expect(
      drawingReferenceLineStrokeWidth({
        paintActive: false,
        active: true,
        hovered: false,
        centerlineSource: false,
      }),
    ).toBe(4);
  });

  it("maps adjacent plain piece edges to the selected corner", () => {
    const rects = [{ x: 0, y: 0, w: 444, h: 76.5 }];

    expect(
      drawingCornerForAdjacentEdges(
        { from: [0, 0], to: [444, 0] },
        { from: [444, 0], to: [444, 76.5] },
        rects,
      ),
    ).toBe("topRight");
    expect(
      drawingCornerForAdjacentEdges(
        { from: [444, 76.5], to: [0, 76.5] },
        { from: [444, 0], to: [444, 76.5] },
        rects,
      ),
    ).toBe("bottomRight");
  });

  it("rejects non-adjacent plain piece edge pairs for corner fillets", () => {
    const rects = [{ x: 0, y: 0, w: 444, h: 76.5 }];

    expect(
      drawingCornerForAdjacentEdges(
        { from: [0, 0], to: [444, 0] },
        { from: [0, 76.5], to: [444, 76.5] },
        rects,
      ),
    ).toBeNull();
  });

  it("starts popup centerline offsets in the same placement mode as the Centerline tool", () => {
    expect(
      drawingCenterlinePlacementModeForOffsetMode("Offset Centerline"),
    ).toBe("midpoint");
    expect(drawingCenterlinePlacementModeForOffsetMode("Offset Edge")).toBe(
      "offset",
    );
  });

  it("infers centerline offset direction from the clicked side of a source line", () => {
    expect(
      drawingCenterlineOffsetDirectionForPoint(
        { from: [0, 0], to: [0, 100] },
        [56, 20],
      ),
    ).toBe("right");
    expect(
      drawingCenterlineOffsetDirectionForPoint(
        { from: [100, 0], to: [100, 100] },
        [44, 20],
      ),
    ).toBe("left");
    expect(
      drawingCenterlineOffsetDirectionForPoint(
        { from: [0, 0], to: [100, 0] },
        [20, 56],
      ),
    ).toBe("down");
    expect(
      drawingCenterlineOffsetDirectionForPoint(
        { from: [0, 100], to: [100, 100] },
        [20, 44],
      ),
    ).toBe("up");
  });

  it("places a direct rectangle centerline through the middle of the piece", () => {
    expect(drawingDirectCenterlineForRectangle(654, 76.5)).toEqual({
      from: [327, 0],
      to: [327, 76.5],
    });
  });

  it("places a direct centerline across a vertical piece", () => {
    expect(drawingDirectCenterlineForRectangle(76.5, 654)).toEqual({
      from: [0, 327],
      to: [76.5, 327],
    });
  });

  it("only offers directions perpendicular to the selected centerline", () => {
    expect(
      drawingCenterlineOffsetDirectionsForLine({
        from: [327, 0],
        to: [327, 76.5],
      }),
    ).toEqual(["left", "right"]);
    expect(
      drawingCenterlineOffsetDirectionsForLine({
        from: [0, 327],
        to: [76.5, 327],
      }),
    ).toEqual(["up", "down"]);
  });
});
