"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createAreaAction, deleteAreaAction, updateAreaAction } from "../_actions";
import { DrawingCanvasInner } from "./DrawingCanvasInner";
import {
  DRAWING_SHEET_TAB_DELETE_LABEL,
  DRAWING_WORKSPACE_ACTIVE_SHEET_CLASS,
  drawingSheetTabCanDelete,
  drawingSheetTabMenuPosition,
} from "./drawing-workspace";
import type {
  CanvasLayout,
  DrawingPiece,
  DrawingRevisionSummary,
  DrawingSink,
} from "./DrawingCanvasInner";
import type { QuoteAreaWithMeasurementTotals } from "./MeasurementsCard";

export type DrawingWorkspaceAreaData = {
  area: QuoteAreaWithMeasurementTotals;
  pieces: DrawingPiece[];
  sinks: DrawingSink[];
  initialLayout: CanvasLayout | null;
  latestRevision: DrawingRevisionSummary | null;
  revisions: DrawingRevisionSummary[];
};

interface DrawingWorkspaceShellProps {
  customerId: string;
  quoteId: string;
  areas: DrawingWorkspaceAreaData[];
  isDraft: boolean;
}

export function DrawingWorkspaceShell({
  customerId,
  quoteId,
  areas,
  isDraft,
}: DrawingWorkspaceShellProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeAreaId, setActiveAreaId] = useState(areas[0]?.area.id ?? null);
  const [renamingAreaId, setRenamingAreaId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [tabMenu, setTabMenu] = useState<{
    areaId: string;
    areaName: string;
    x: number;
    y: number;
  } | null>(null);

  const activeArea = useMemo(
    () =>
      areas.find((areaData) => areaData.area.id === activeAreaId) ??
      areas[0] ??
      null,
    [activeAreaId, areas],
  );
  const createAreaWithIds = createAreaAction.bind(null, customerId, quoteId);
  const canDeleteArea = drawingSheetTabCanDelete(areas.length);

  const submitRename = (areaData: DrawingWorkspaceAreaData) => {
    const nextName = renameValue.trim();
    if (!nextName) return;

    const formData = new FormData();
    formData.set("name", nextName);
    formData.set("sortOrder", String(areaData.area.sortOrder));
    if (areaData.area.material) formData.set("material", areaData.area.material);
    if (areaData.area.color) formData.set("color", areaData.area.color);
    if (areaData.area.edgeProfile)
      formData.set("edgeProfile", areaData.area.edgeProfile);
    if (areaData.area.notes) formData.set("notes", areaData.area.notes);

    startTransition(async () => {
      const result = await updateAreaAction(
        customerId,
        quoteId,
        areaData.area.id,
        formData,
      );
      if (result.ok) {
        setRenamingAreaId(null);
        router.refresh();
      }
    });
  };

  const deleteArea = (areaId: string, areaName: string) => {
    if (!canDeleteArea) return;
    if (!window.confirm(`Delete area "${areaName}"? This removes its drawing.`)) {
      return;
    }

    startTransition(async () => {
      await deleteAreaAction(customerId, quoteId, areaId);
      setTabMenu(null);
      if (activeAreaId === areaId) {
        setActiveAreaId(
          areas.find((areaData) => areaData.area.id !== areaId)?.area.id ?? null,
        );
      }
      router.refresh();
    });
  };

  if (areas.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 flex-col bg-[#f7faf4]">
        <div className="flex min-h-0 flex-1 items-center justify-center">
          {isDraft ? (
            <form action={createAreaWithIds} className="flex items-center gap-2">
              <Input name="name" placeholder="Area name" required className="w-56" />
              <input type="hidden" name="sortOrder" value="0" />
              <Button type="submit">Add Area</Button>
            </form>
          ) : (
            <p className="text-sm text-muted-foreground">No Areas.</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-white">
      <div
        className={DRAWING_WORKSPACE_ACTIVE_SHEET_CLASS}
        onClick={() => setTabMenu(null)}
      >
        {activeArea ? (
          <DrawingCanvasInner
            key={activeArea.area.id}
            customerId={customerId}
            quoteId={quoteId}
            areaId={activeArea.area.id}
            area={activeArea.area}
            pieces={activeArea.pieces}
            sinks={activeArea.sinks}
            initialLayout={activeArea.initialLayout}
            latestRevision={activeArea.latestRevision}
            revisions={activeArea.revisions}
            isDraft={isDraft}
            fullscreen
          />
        ) : null}
      </div>

      <div
        className="relative flex min-h-12 items-center gap-2 overflow-x-auto border-t bg-white px-3 py-2"
        onClick={() => setTabMenu(null)}
      >
        {areas.map((areaData) => {
          const selected = activeArea?.area.id === areaData.area.id;
          const renaming = renamingAreaId === areaData.area.id;

          return renaming ? (
            <form
              key={areaData.area.id}
              onSubmit={(event) => {
                event.preventDefault();
                submitRename(areaData);
              }}
              className="flex items-center gap-1"
            >
              <Input
                value={renameValue}
                onChange={(event) => setRenameValue(event.target.value)}
                onBlur={() => setRenamingAreaId(null)}
                autoFocus
                className="h-8 w-36"
                disabled={isPending}
              />
            </form>
          ) : (
            <button
              key={areaData.area.id}
              type="button"
              className={`h-8 whitespace-nowrap rounded-t-md border px-3 text-sm ${
                selected
                  ? "border-[#5f9659] bg-[#eef7ec] font-medium text-[#2f6b2c]"
                  : "bg-white text-muted-foreground hover:bg-muted"
              }`}
              onClick={() => setActiveAreaId(areaData.area.id)}
              onContextMenu={(event) => {
                event.preventDefault();
                if (!isDraft || !canDeleteArea) return;
                const position = drawingSheetTabMenuPosition({
                  clickX: event.clientX,
                  clickY: event.clientY,
                  viewportWidth: window.innerWidth,
                  viewportHeight: window.innerHeight,
                });
                setTabMenu({
                  areaId: areaData.area.id,
                  areaName: areaData.area.name,
                  x: position.x,
                  y: position.y,
                });
              }}
              onDoubleClick={() => {
                if (!isDraft) return;
                setRenamingAreaId(areaData.area.id);
                setRenameValue(areaData.area.name);
              }}
            >
              {areaData.area.name}
            </button>
          );
        })}

        {isDraft ? (
          <form action={createAreaWithIds} className="ml-auto flex items-center gap-2">
            <Input name="name" placeholder="New Area" required className="h-8 w-32" />
            <input type="hidden" name="sortOrder" value={String(areas.length)} />
            <Button type="submit" size="sm" variant="outline">
              Add
            </Button>
          </form>
        ) : null}
        {tabMenu ? (
          <div
            className="fixed z-50 min-w-36 rounded-md border bg-white p-1 text-sm shadow-xl"
            style={{ left: tabMenu.x, top: tabMenu.y }}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="block w-full rounded px-3 py-2 text-left text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isPending || !canDeleteArea}
              onClick={() => deleteArea(tabMenu.areaId, tabMenu.areaName)}
            >
              {DRAWING_SHEET_TAB_DELETE_LABEL}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
