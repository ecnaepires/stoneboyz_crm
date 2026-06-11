# Universal Line Rules Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build shared Construction Line rules so Segment, Centerline offset, and Extend use one piece-local geometry model.

**Architecture:** Add reusable line geometry helpers in the domain drawing package, then wire the drawing workspace UI to those helpers. Segment becomes length + 8-way direction + start-point placement; Extend becomes target-first, source-second line extension that never mutates countertop geometry.

**Tech Stack:** TypeScript, Vitest, Next.js React, Konva/react-konva, `@stoneboyz/domain`.

---

## File Structure

- Modify `packages/domain/src/drawing/types.ts`: add shared line direction and line kind types.
- Modify `packages/domain/src/drawing/geometry.ts`: add Construction Line helpers for direction, exact placement, offset, and target-first extension.
- Modify `packages/domain/src/drawing/geometry.test.ts`: add unit coverage for piece-local directions, segment placement, offset, target-first extension, and no-intersection failures.
- Modify `apps/web/src/app/customers/[id]/quotes/[quoteId]/DrawingCanvasInner.tsx`: replace freehand Segment behavior with popup-driven exact line placement, and replace auto Extend behavior with target-first state.
- Modify `apps/web/src/app/customers/[id]/quotes/[quoteId]/drawing-workspace.ts`: add UI constants for the Segment direction picker and helper labels.
- Modify `apps/web/src/app/customers/[id]/quotes/[quoteId]/drawing-workspace.test.ts`: add contract tests for Segment direction labels and Extend target-first labels.

## Task 1: Domain Construction Line Types

**Files:**
- Modify: `packages/domain/src/drawing/types.ts`
- Test: `packages/domain/src/drawing/geometry.test.ts`

- [ ] **Step 1: Write failing type-level/import test**

Add imports to `packages/domain/src/drawing/geometry.test.ts`:

```ts
import type {
  DrawingLineDirection,
  DrawingConstructionLineKind,
} from "./types.js";
```

Add this test near existing centerline tests:

```ts
it("exposes construction line kinds and squared directions", () => {
  const kind: DrawingConstructionLineKind = "segment";
  const direction: DrawingLineDirection = "upRight";

  expect(kind).toBe("segment");
  expect(direction).toBe("upRight");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm test packages/domain/src/drawing/geometry.test.ts
```

Expected: FAIL with TypeScript/Vitest import error because `DrawingLineDirection` and `DrawingConstructionLineKind` are not exported.

- [ ] **Step 3: Add minimal domain types**

In `packages/domain/src/drawing/types.ts`, add after `DrawingEdgeTreatment`:

```ts
export type DrawingLineDirection =
  | "right"
  | "downRight"
  | "down"
  | "downLeft"
  | "left"
  | "upLeft"
  | "up"
  | "upRight";

export type DrawingConstructionLineKind =
  | "segment"
  | "centerline"
  | "cabinet"
  | "wall";
```

Update `DrawingReferenceLine` and `DrawingReferenceLineVisualSegment` in the same file:

```ts
export interface DrawingReferenceLine {
  id: string;
  pieceId: string;
  from: [number, number];
  to: [number, number];
  kind: DrawingConstructionLineKind;
  color: string;
  dash?: boolean;
}

export interface DrawingReferenceLineVisualSegment {
  id: string;
  sourceLineId: string;
  pieceId: string;
  from: [number, number];
  to: [number, number];
  kind: DrawingConstructionLineKind;
  color: string;
  dash: boolean;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
pnpm test packages/domain/src/drawing/geometry.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

Only commit if worktree staging can isolate these files cleanly:

```bash
git add packages/domain/src/drawing/types.ts packages/domain/src/drawing/geometry.test.ts
git commit -m "feat: define construction line directions"
```

## Task 2: Domain Segment Placement Helper

**Files:**
- Modify: `packages/domain/src/drawing/geometry.ts`
- Modify: `packages/domain/src/drawing/geometry.test.ts`

- [ ] **Step 1: Write failing tests for exact piece-local segment placement**

Add imports:

```ts
import {
  buildConstructionLineFromDirection,
  drawingLineDirectionVector,
} from "./geometry.js";
```

Add tests:

```ts
it("maps 8-way directions to piece-local unit vectors", () => {
  expect(drawingLineDirectionVector("right")).toEqual([1, 0]);
  expect(drawingLineDirectionVector("down")).toEqual([0, 1]);
  expect(drawingLineDirectionVector("left")).toEqual([-1, 0]);
  expect(drawingLineDirectionVector("up")).toEqual([0, -1]);
  expect(drawingLineDirectionVector("upRight")).toEqual([Math.SQRT1_2, -Math.SQRT1_2]);
});

it("builds a segment line from anchor, length, and squared direction", () => {
  expect(
    buildConstructionLineFromDirection({
      id: "segment-1",
      pieceId: "piece-1",
      kind: "segment",
      anchor: [30, 60],
      direction: "up",
      lengthIn: 10,
      scale: SCALE,
      color: "#6b7280",
    }),
  ).toEqual({
    id: "segment-1",
    pieceId: "piece-1",
    from: [30, 60],
    to: [30, 30],
    kind: "segment",
    color: "#6b7280",
    dash: false,
  });
});

it("rounds diagonal segment endpoints to drawing sixteenths", () => {
  expect(
    buildConstructionLineFromDirection({
      id: "segment-2",
      pieceId: "piece-1",
      kind: "segment",
      anchor: [0, 0],
      direction: "downRight",
      lengthIn: 10,
      scale: SCALE,
      color: "#6b7280",
    })?.to,
  ).toEqual([21.1875, 21.1875]);
});

it("rejects non-positive segment lengths", () => {
  expect(
    buildConstructionLineFromDirection({
      id: "segment-3",
      pieceId: "piece-1",
      kind: "segment",
      anchor: [0, 0],
      direction: "right",
      lengthIn: 0,
      scale: SCALE,
    }),
  ).toBeNull();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
pnpm test packages/domain/src/drawing/geometry.test.ts
```

Expected: FAIL because helper functions are missing.

- [ ] **Step 3: Implement minimal helpers**

In `packages/domain/src/drawing/geometry.ts`, add imports:

```ts
import type {
  DrawingConstructionLineKind,
  DrawingLineDirection,
} from "./types.js";
```

Add near `offsetCenterline`:

```ts
export function drawingLineDirectionVector(
  direction: DrawingLineDirection,
): [number, number] {
  if (direction === "right") return [1, 0];
  if (direction === "downRight") return [Math.SQRT1_2, Math.SQRT1_2];
  if (direction === "down") return [0, 1];
  if (direction === "downLeft") return [-Math.SQRT1_2, Math.SQRT1_2];
  if (direction === "left") return [-1, 0];
  if (direction === "upLeft") return [-Math.SQRT1_2, -Math.SQRT1_2];
  if (direction === "up") return [0, -1];
  return [Math.SQRT1_2, -Math.SQRT1_2];
}

export function buildConstructionLineFromDirection(params: {
  id: string;
  pieceId: string;
  kind: DrawingConstructionLineKind;
  anchor: [number, number];
  direction: DrawingLineDirection;
  lengthIn: number;
  scale: number;
  color?: string;
  dash?: boolean;
}): DrawingReferenceLine | null {
  const lengthPx = params.lengthIn * params.scale;
  if (!Number.isFinite(lengthPx) || lengthPx <= 0) return null;

  const [dx, dy] = drawingLineDirectionVector(params.direction);
  return {
    id: params.id,
    pieceId: params.pieceId,
    from: params.anchor,
    to: [
      roundDrawingInches(params.anchor[0] + dx * lengthPx),
      roundDrawingInches(params.anchor[1] + dy * lengthPx),
    ],
    kind: params.kind,
    color: params.color ?? "#6b7280",
    dash: params.dash ?? false,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
pnpm test packages/domain/src/drawing/geometry.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/domain/src/drawing/geometry.ts packages/domain/src/drawing/geometry.test.ts
git commit -m "feat: place construction lines by direction"
```

## Task 3: Domain Universal Offset And Extend Helpers

**Files:**
- Modify: `packages/domain/src/drawing/geometry.ts`
- Modify: `packages/domain/src/drawing/geometry.test.ts`

- [ ] **Step 1: Write failing tests for offset and target-first extension**

Add imports:

```ts
import {
  extendConstructionLineToTarget,
  offsetConstructionLine,
} from "./geometry.js";
```

Add tests:

```ts
it("offsets a diagonal construction line perpendicular to its span", () => {
  expect(
    offsetConstructionLine({
      line: {
        from: [0, 0],
        to: [30, 30],
      },
      offsetIn: 10,
      side: "left",
      scale: SCALE,
    }),
  ).toEqual({
    from: [-21.1875, 21.1875],
    to: [8.8125, 51.1875],
  });
});

it("extends source line to selected target while preserving source direction", () => {
  expect(
    extendConstructionLineToTarget({
      source: {
        from: [30, 0],
        to: [30, 30],
      },
      target: {
        from: [0, depth],
        to: [300, depth],
      },
    }),
  ).toEqual({
    from: [30, 0],
    to: [30, depth],
  });
});

it("returns null when source direction cannot intersect target", () => {
  expect(
    extendConstructionLineToTarget({
      source: {
        from: [0, 0],
        to: [30, 0],
      },
      target: {
        from: [0, 10],
        to: [30, 10],
      },
    }),
  ).toBeNull();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
pnpm test packages/domain/src/drawing/geometry.test.ts
```

Expected: FAIL because `offsetConstructionLine` and `extendConstructionLineToTarget` are missing.

- [ ] **Step 3: Implement shared offset and intersection helpers**

Add to `packages/domain/src/drawing/geometry.ts` near other line helpers:

```ts
function normalizeLineVector(line: DrawingShapeEdge): [number, number] | null {
  const dx = line.to[0] - line.from[0];
  const dy = line.to[1] - line.from[1];
  const length = Math.hypot(dx, dy);
  if (length <= 0.001) return null;
  return [dx / length, dy / length];
}

function lineIntersection(
  source: DrawingShapeEdge,
  target: DrawingShapeEdge,
): [number, number] | null {
  const sx = source.to[0] - source.from[0];
  const sy = source.to[1] - source.from[1];
  const tx = target.to[0] - target.from[0];
  const ty = target.to[1] - target.from[1];
  const denominator = sx * ty - sy * tx;
  if (Math.abs(denominator) <= 0.001) return null;

  const dx = target.from[0] - source.from[0];
  const dy = target.from[1] - source.from[1];
  const sourceT = (dx * ty - dy * tx) / denominator;
  const targetT = (dx * sy - dy * sx) / denominator;
  if (sourceT < -0.001 || targetT < -0.001 || targetT > 1.001) return null;

  return [
    roundDrawingInches(source.from[0] + sourceT * sx),
    roundDrawingInches(source.from[1] + sourceT * sy),
  ];
}

export function offsetConstructionLine(params: {
  line: DrawingShapeEdge;
  offsetIn: number;
  side: "left" | "right";
  scale: number;
}): DrawingShapeEdge | null {
  const distancePx = params.offsetIn * params.scale;
  if (!Number.isFinite(distancePx) || distancePx <= 0) return null;

  const unit = normalizeLineVector(params.line);
  if (!unit) return null;
  const [ux, uy] = unit;
  const side = params.side === "left" ? 1 : -1;
  const nx = -uy * distancePx * side;
  const ny = ux * distancePx * side;

  return {
    from: [
      roundDrawingInches(params.line.from[0] + nx),
      roundDrawingInches(params.line.from[1] + ny),
    ],
    to: [
      roundDrawingInches(params.line.to[0] + nx),
      roundDrawingInches(params.line.to[1] + ny),
    ],
  };
}

export function extendConstructionLineToTarget(params: {
  source: DrawingShapeEdge;
  target: DrawingShapeEdge;
}): DrawingShapeEdge | null {
  const intersection = lineIntersection(
    {
      from: params.source.from,
      to: [
        params.source.from[0] + (params.source.to[0] - params.source.from[0]) * 10000,
        params.source.from[1] + (params.source.to[1] - params.source.from[1]) * 10000,
      ],
    },
    params.target,
  );
  if (!intersection) return null;

  return {
    from: params.source.from,
    to: intersection,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
pnpm test packages/domain/src/drawing/geometry.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/domain/src/drawing/geometry.ts packages/domain/src/drawing/geometry.test.ts
git commit -m "feat: extend construction lines to targets"
```

## Task 4: Drawing Workspace Segment Popup Contract

**Files:**
- Modify: `apps/web/src/app/customers/[id]/quotes/[quoteId]/drawing-workspace.ts`
- Modify: `apps/web/src/app/customers/[id]/quotes/[quoteId]/drawing-workspace.test.ts`

- [ ] **Step 1: Write failing contract test**

Add imports:

```ts
import {
  DRAWING_SEGMENT_DIRECTION_OPTIONS,
  DRAWING_SEGMENT_DEFAULT_LENGTH_IN,
} from "./drawing-workspace";
```

Add test:

```ts
it("offers an 8-way piece-local Segment direction picker", () => {
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
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm test apps/web/src/app/customers/[id]/quotes/[quoteId]/drawing-workspace.test.ts
```

Expected: FAIL because constants do not exist.

- [ ] **Step 3: Add UI constants**

In `drawing-workspace.ts`, add:

```ts
import type { DrawingLineDirection } from "@stoneboyz/domain";

export const DRAWING_SEGMENT_DEFAULT_LENGTH_IN = 10;

export const DRAWING_SEGMENT_DIRECTION_OPTIONS: Array<{
  value: DrawingLineDirection;
  label: string;
  title: string;
}> = [
  { value: "upLeft", label: "↖", title: "Up left" },
  { value: "up", label: "↑", title: "Up" },
  { value: "upRight", label: "↗", title: "Up right" },
  { value: "left", label: "←", title: "Left" },
  { value: "right", label: "→", title: "Right" },
  { value: "downLeft", label: "↙", title: "Down left" },
  { value: "down", label: "↓", title: "Down" },
  { value: "downRight", label: "↘", title: "Down right" },
];
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
pnpm test apps/web/src/app/customers/[id]/quotes/[quoteId]/drawing-workspace.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/customers/[id]/quotes/[quoteId]/drawing-workspace.ts apps/web/src/app/customers/[id]/quotes/[quoteId]/drawing-workspace.test.ts
git commit -m "feat: define segment direction picker"
```

## Task 5: Segment Popup And Exact Placement UI

**Files:**
- Modify: `apps/web/src/app/customers/[id]/quotes/[quoteId]/DrawingCanvasInner.tsx`
- Test: `packages/domain/src/drawing/geometry.test.ts`
- Test: `apps/web/src/app/customers/[id]/quotes/[quoteId]/drawing-workspace.test.ts`

- [ ] **Step 1: Add component state**

In `DrawingCanvasInner.tsx`, import:

```ts
import type { DrawingLineDirection } from "@stoneboyz/domain";
```

Import helpers/constants:

```ts
import {
  buildConstructionLineFromDirection,
} from "@stoneboyz/domain";
import {
  DRAWING_SEGMENT_DEFAULT_LENGTH_IN,
  DRAWING_SEGMENT_DIRECTION_OPTIONS,
} from "./drawing-workspace";
```

Add state near existing Segment state:

```ts
const [segmentLengthIn, setSegmentLengthIn] = useState(
  String(DRAWING_SEGMENT_DEFAULT_LENGTH_IN),
);
const [segmentDirection, setSegmentDirection] =
  useState<DrawingLineDirection>("up");
```

- [ ] **Step 2: Replace freehand segment placement function**

Replace `handleSegmentPointerDown` behavior with one-click placement:

```ts
const placeSegmentAtPointer = useCallback(
  (pointer: { x: number; y: number }) => {
    const lengthIn = Number(segmentLengthIn);
    if (!Number.isFinite(lengthIn) || lengthIn <= 0) {
      setCanvasError("Enter a positive segment length.");
      return;
    }

    const pieceId =
      selectedPieceId ??
      pieceIdAtCanvasPoint({
        point: pointer,
        pieces,
        layouts: layoutRef.current.pieces,
      });
    if (!pieceId) {
      setCanvasError("Click a start point on a countertop piece.");
      return;
    }

    const pieceLayout = layoutRef.current.pieces.find(
      (piece) => piece.pieceId === pieceId,
    );
    if (!pieceLayout) {
      setCanvasError("Click a start point on a countertop piece.");
      return;
    }

    const anchor = canvasPointToPiecePoint(pieceLayout, pointer);
    const line = buildConstructionLineFromDirection({
      id: lineId("segment"),
      pieceId,
      kind: "segment",
      anchor: [anchor.x, anchor.y],
      direction: segmentDirection,
      lengthIn,
      scale: SCALE,
      color: PIECE_STROKE,
    });
    if (!line) {
      setCanvasError("Enter a positive segment length.");
      return;
    }

    setSelectedPieceId(pieceId);
    setSelectedPieceIds([pieceId]);
    setLayout((prev) => ({
      ...prev,
      referenceLines: [...prev.referenceLines, line],
    }));
    setCanvasError(null);
    markDirty();
  },
  [markDirty, pieces, segmentDirection, segmentLengthIn, selectedPieceId],
);
```

Update stage handlers so `tool === "segment"` calls `placeSegmentAtPointer(pointer)` and does not use `segmentStart`/`segmentPreview`.

- [ ] **Step 3: Replace Segment panel copy and controls**

Replace Segment panel body with:

```tsx
{tool === "segment" ? (
  <div className="rounded-md border border-[#c8dec3] bg-white p-4 shadow-sm">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p className="font-semibold text-[#2f6b2c]">Segment</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter length, choose direction, then click the start point on the countertop.
        </p>
      </div>
      <Button size="sm" variant="outline" onClick={() => setTool("draw")}>
        Done
      </Button>
    </div>
    <div className="mt-3 flex flex-wrap items-center gap-3">
      <Label htmlFor={`segment-length-${areaId}`}>Length</Label>
      <Input
        id={`segment-length-${areaId}`}
        type="number"
        min="0.0625"
        step="0.0625"
        value={segmentLengthIn}
        onChange={(event) => setSegmentLengthIn(event.target.value)}
        className="h-8 w-24"
      />
      <span className="text-xs text-muted-foreground">&quot;</span>
      <div className="grid grid-cols-3 gap-1">
        {DRAWING_SEGMENT_DIRECTION_OPTIONS.map((option) => (
          <Button
            key={option.value}
            type="button"
            variant={segmentDirection === option.value ? "default" : "outline"}
            size="sm"
            aria-label={`Segment direction ${option.title}`}
            title={option.title}
            onClick={() => setSegmentDirection(option.value)}
            className="h-8 w-8 p-0"
          >
            {option.label}
          </Button>
        ))}
      </div>
    </div>
  </div>
) : null}
```

- [ ] **Step 4: Run focused tests**

Run:

```bash
pnpm test packages/domain/src/drawing/geometry.test.ts apps/web/src/app/customers/[id]/quotes/[quoteId]/drawing-workspace.test.ts
pnpm typecheck:web
```

Expected: both test files PASS and web typecheck PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/domain/src/drawing/geometry.ts packages/domain/src/drawing/types.ts packages/domain/src/drawing/geometry.test.ts apps/web/src/app/customers/[id]/quotes/[quoteId]/DrawingCanvasInner.tsx apps/web/src/app/customers/[id]/quotes/[quoteId]/drawing-workspace.ts apps/web/src/app/customers/[id]/quotes/[quoteId]/drawing-workspace.test.ts
git commit -m "feat: place segment lines from exact direction"
```

## Task 6: Shared Construction Line Offset UI

**Files:**
- Modify: `apps/web/src/app/customers/[id]/quotes/[quoteId]/DrawingCanvasInner.tsx`
- Test: `packages/domain/src/drawing/geometry.test.ts`

- [ ] **Step 1: Add selected line offset state**

In `DrawingCanvasInner.tsx`, import:

```ts
import { offsetConstructionLine } from "@stoneboyz/domain";
```

Add state near other line tool state:

```ts
const [selectedConstructionLineId, setSelectedConstructionLineId] =
  useState<string | null>(null);
const [constructionLineOffsetIn, setConstructionLineOffsetIn] = useState("1");
```

- [ ] **Step 2: Add offset action**

Add near Centerline offset actions:

```ts
const offsetSelectedConstructionLine = useCallback(
  (side: "left" | "right") => {
    if (!selectedConstructionLineId) {
      setCanvasError("Select a segment or centerline to offset.");
      return;
    }

    const offsetIn = Number(constructionLineOffsetIn);
    if (!Number.isFinite(offsetIn) || offsetIn <= 0) {
      setCanvasError("Enter a positive offset.");
      return;
    }

    const line = layoutRef.current.referenceLines.find(
      (item) => item.id === selectedConstructionLineId,
    );
    if (!line) {
      setCanvasError("Select a segment or centerline to offset.");
      return;
    }

    const offsetLine = offsetConstructionLine({
      line: {
        from: line.from,
        to: line.to,
      },
      offsetIn,
      side,
      scale: SCALE,
    });
    if (!offsetLine) {
      setCanvasError("Selected line cannot be offset.");
      return;
    }

    setLayout((prev) => ({
      ...prev,
      referenceLines: [
        ...prev.referenceLines,
        {
          ...line,
          id: lineId(`${line.kind}-offset`),
          from: offsetLine.from,
          to: offsetLine.to,
        },
      ],
    }));
    setCanvasError(null);
    markDirty();
  },
  [constructionLineOffsetIn, markDirty, selectedConstructionLineId],
);
```

- [ ] **Step 3: Select construction lines on click**

Where reference lines render, add click behavior for segment/centerline lines:

```ts
onClick={(event) => {
  event.cancelBubble = true;
  if (tool === "extend") {
    extendSourceToSelectedTarget({
      pieceId: line.pieceId,
      sourceLineId: line.id,
      source: { from: line.from, to: line.to },
    });
    return;
  }
  setSelectedConstructionLineId(line.id);
  setSelectedPieceId(line.pieceId);
  setSelectedPieceIds([line.pieceId]);
}}
```

- [ ] **Step 4: Add offset controls to Segment and Centerline panels**

Add this compact control block in both Segment and Centerline panels:

```tsx
<div className="flex items-center gap-2">
  <Label htmlFor={`construction-line-offset-${areaId}`}>Offset</Label>
  <Input
    id={`construction-line-offset-${areaId}`}
    type="number"
    min="0.0625"
    step="0.0625"
    value={constructionLineOffsetIn}
    onChange={(event) => setConstructionLineOffsetIn(event.target.value)}
    className="h-8 w-24"
  />
  <Button
    type="button"
    variant="outline"
    size="sm"
    disabled={!selectedConstructionLineId}
    onClick={() => offsetSelectedConstructionLine("left")}
  >
    Left
  </Button>
  <Button
    type="button"
    variant="outline"
    size="sm"
    disabled={!selectedConstructionLineId}
    onClick={() => offsetSelectedConstructionLine("right")}
  >
    Right
  </Button>
</div>
```

- [ ] **Step 5: Run verification**

Run:

```bash
pnpm test packages/domain/src/drawing/geometry.test.ts apps/web/src/app/customers/[id]/quotes/[quoteId]/drawing-workspace.test.ts
pnpm typecheck:web
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/customers/[id]/quotes/[quoteId]/DrawingCanvasInner.tsx
git commit -m "feat: offset construction lines"
```

## Task 7: Target-First Extend UI

**Files:**
- Modify: `apps/web/src/app/customers/[id]/quotes/[quoteId]/DrawingCanvasInner.tsx`
- Modify: `apps/web/src/app/customers/[id]/quotes/[quoteId]/drawing-workspace.ts`
- Modify: `apps/web/src/app/customers/[id]/quotes/[quoteId]/drawing-workspace.test.ts`

- [ ] **Step 1: Add Extend contract test**

In `drawing-workspace.ts`, add:

```ts
export const DRAWING_EXTEND_TARGET_FIRST_HELP =
  "Click target first, then click the line or edge to extend.";
```

In `drawing-workspace.test.ts`, add:

```ts
it("describes Extend as target first then source", () => {
  expect(DRAWING_EXTEND_TARGET_FIRST_HELP).toBe(
    "Click target first, then click the line or edge to extend.",
  );
});
```

Run:

```bash
pnpm test apps/web/src/app/customers/[id]/quotes/[quoteId]/drawing-workspace.test.ts
```

Expected: FAIL until constant is exported, then PASS after adding it.

- [ ] **Step 2: Add Extend state**

In `DrawingCanvasInner.tsx`, add:

```ts
interface ExtendTargetState {
  pieceId: string;
  line: ShapeEdge;
  label: string;
}

const [extendTarget, setExtendTarget] = useState<ExtendTargetState | null>(null);
```

- [ ] **Step 3: Add source extension function**

Import:

```ts
import { extendConstructionLineToTarget } from "@stoneboyz/domain";
```

Add:

```ts
const extendSourceToSelectedTarget = useCallback(
  (params: {
    pieceId: string;
    sourceLineId?: string;
    source: ShapeEdge;
    createIfEdge?: boolean;
  }) => {
    if (!extendTarget) {
      setExtendTarget({
        pieceId: params.pieceId,
        line: params.source,
        label: "target",
      });
      setCanvasError(null);
      return;
    }

    if (extendTarget.pieceId !== params.pieceId) {
      setCanvasError("Choose a target and source on the same countertop piece.");
      return;
    }

    const extended = extendConstructionLineToTarget({
      source: params.source,
      target: extendTarget.line,
    });
    if (!extended) {
      setCanvasError("Selected source cannot reach the target while staying squared.");
      return;
    }

    setLayout((prev) => ({
      ...prev,
      referenceLines: params.sourceLineId
        ? prev.referenceLines.map((line) =>
            line.id === params.sourceLineId
              ? { ...line, from: extended.from, to: extended.to }
              : line,
          )
        : [
            ...prev.referenceLines,
            buildReferenceLine({
              id: lineId("extend"),
              pieceId: params.pieceId,
              edge: extended,
              kind: "segment",
              color: PIECE_STROKE,
            }),
          ],
    }));
    setExtendTarget(null);
    setCanvasError(null);
    markDirty();
  },
  [extendTarget, markDirty],
);
```

- [ ] **Step 4: Wire Extend clicks**

For reference line click targets where current code calls `extendReferenceLine(pieceId, line.id)`, replace with:

```ts
extendSourceToSelectedTarget({
  pieceId,
  sourceLineId: line.id,
  source: {
    from: line.from,
    to: line.to,
  },
});
```

For counter boundary edge clicks in Extend mode, call:

```ts
extendSourceToSelectedTarget({
  pieceId: pos.pieceId,
  source: edge,
  createIfEdge: true,
});
```

The first Extend click stores target. The second Extend click extends source.

- [ ] **Step 5: Update Extend panel copy**

Use the shared constant:

```tsx
<p className="mt-1 text-sm text-muted-foreground">
  {extendTarget
    ? "Target selected. Click the line or edge to extend."
    : DRAWING_EXTEND_TARGET_FIRST_HELP}
</p>
```

Add Done button behavior:

```tsx
onClick={() => {
  setExtendTarget(null);
  setTool("draw");
}}
```

- [ ] **Step 6: Run verification**

Run:

```bash
pnpm test packages/domain/src/drawing/geometry.test.ts apps/web/src/app/customers/[id]/quotes/[quoteId]/drawing-workspace.test.ts
pnpm typecheck:web
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/domain/src/drawing/geometry.ts packages/domain/src/drawing/geometry.test.ts apps/web/src/app/customers/[id]/quotes/[quoteId]/DrawingCanvasInner.tsx apps/web/src/app/customers/[id]/quotes/[quoteId]/drawing-workspace.ts apps/web/src/app/customers/[id]/quotes/[quoteId]/drawing-workspace.test.ts
git commit -m "feat: extend construction lines to selected targets"
```

## Task 8: Manual Browser Verification

**Files:**
- No code changes expected.

- [ ] **Step 1: Start dev servers**

Run:

```bash
pnpm -C apps/api build
pnpm -C apps/api start
pnpm -C apps/web dev
```

Expected:
- API listens on `3001`.
- Web listens on `3000`.

- [ ] **Step 2: Verify Segment flow**

Open:

```text
http://localhost:3000
```

Expected:
- Drawing workspace loads after auth.
- Clicking Segment shows length input and 8 arrows.
- Entering `10`, choosing `↑`, then clicking countertop creates exact 10-inch line toward the piece-local top/back.
- Zooming/panning does not detach or misplace the line.

- [ ] **Step 3: Verify Extend flow**

Expected:
- Click Extend.
- Click back edge/target.
- Click a 10-inch front-to-back segment.
- Segment extends to target edge, preserving direction.
- Clicking a counter edge as source creates a Construction Line instead of changing countertop shape.

- [ ] **Step 4: Run final checks**

Run:

```bash
pnpm test packages/domain/src/drawing/geometry.test.ts apps/web/src/app/customers/[id]/quotes/[quoteId]/drawing-workspace.test.ts
pnpm typecheck:web
```

Expected: PASS.

- [ ] **Step 5: Commit manual verification notes only if code changed**

If manual verification causes code changes, commit those files with:

```bash
git add <changed-files>
git commit -m "fix: polish construction line interactions"
```

## Self-Review

Spec coverage:
- Piece-local Construction Lines: Tasks 1, 2, 5.
- Segment popup length + arrows: Tasks 4, 5.
- Offset shared with Centerline: Tasks 3 and 6.
- Target-first Extend: Tasks 3 and 7.
- Countertop edge source creates Construction Line: Task 7.
- No countertop geometry mutation: Task 7.

Placeholder scan:
- No placeholder text remains.
- Error messages are explicit.
- Commands include expected outcomes.

Type consistency:
- `DrawingLineDirection` and `DrawingConstructionLineKind` originate in Task 1.
- `buildConstructionLineFromDirection`, `offsetConstructionLine`, and `extendConstructionLineToTarget` originate before frontend tasks use them.
- Frontend Segment and Extend use existing `lineId`, `buildReferenceLine`, `canvasPointToPiecePoint`, and `pieceIdAtCanvasPoint` helpers already present in `DrawingCanvasInner.tsx`.
