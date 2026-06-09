"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { overridePricingLineAction, saveAreaPricingAction } from "../_actions";
import {
  EMPTY_AREA_SELECTION,
  GROUP_FIELDS,
  displayedAreaTotal,
  estimateLines,
  isAreaSaved,
  savedLinesTotal,
  type AccordionArea,
  type AccordionGroup,
  type AccordionItem,
  type AreaSelection,
  type GeneratedLine,
} from "./pricing-accordion-calculations";

export type {
  AccordionArea,
  AccordionGroup,
  AccordionItem,
  AreaSelection,
  GeneratedLine,
} from "./pricing-accordion-calculations";

interface PricingAccordionProps {
  customerId: string;
  quoteId: string;
  isDraft: boolean;
  areas: AccordionArea[];
  itemsByGroup: Record<AccordionGroup, AccordionItem[]>;
  materialSlabs: MaterialSlab[];
}

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;
const num = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 2 });
const dollars = (cents: number | null) => (cents === null ? "" : (cents / 100).toFixed(2));

type MaterialSlab = {
  id: string;
  stoneType: string;
  lengthIn: number;
  widthIn: number;
  status: "available" | "negotiating" | "reserved" | "cut" | "remnant";
  lotNumber?: string | null;
  bundleNumber?: string | null;
  warehouseLocation?: string | null;
};

const slabLabel = (slab: MaterialSlab) => {
  const parts = [
    slab.stoneType,
    `${num(slab.lengthIn)} x ${num(slab.widthIn)}`,
    slab.status,
    slab.lotNumber ? `Lot ${slab.lotNumber}` : null,
    slab.warehouseLocation,
  ].filter(Boolean);
  return parts.join(" · ");
};

export function PricingAccordion({ customerId, quoteId, isDraft, areas, itemsByGroup, materialSlabs }: PricingAccordionProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [picks, setPicks] = useState<Record<string, AreaSelection>>(() => {
    const initial: Record<string, AreaSelection> = {};
    for (const area of areas) initial[area.id] = area.selection;
    return initial;
  });
  const [openId, setOpenId] = useState<string | null>(areas[0]?.id ?? null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savingLineId, setSavingLineId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pickOf = (areaId: string): AreaSelection =>
    picks[areaId] ?? EMPTY_AREA_SELECTION;

  const updatePick = (areaId: string, patch: Partial<AreaSelection>) =>
    setPicks((current) => ({ ...current, [areaId]: { ...pickOf(areaId), ...patch } }));

  const setField = (areaId: string, field: keyof AreaSelection, value: string) => {
    if (field === "materialItemId" && value === "") {
      updatePick(areaId, {
        materialItemId: null,
        materialSource: "external",
        materialSlabId: null,
        externalMaterialNote: null,
      });
      return;
    }

    updatePick(areaId, { [field]: value === "" ? null : value });
  };

  const setMaterialSource = (areaId: string, materialSource: AreaSelection["materialSource"]) =>
    updatePick(areaId, {
      materialSource,
      materialSlabId: materialSource === "external" ? null : pickOf(areaId).materialSlabId,
      externalMaterialNote: materialSource === "inventory" ? null : pickOf(areaId).externalMaterialNote,
    });

  const saveArea = (area: AccordionArea) => {
    setError(null);
    setSavingId(area.id);
    startTransition(async () => {
      const result = await saveAreaPricingAction(customerId, quoteId, area.id, pickOf(area.id));
      setSavingId(null);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const next = areas.find((candidate) => candidate.lines.length === 0 && candidate.id !== area.id);
      setOpenId(next ? next.id : null);
      router.refresh();
    });
  };

  const saveLineOverride = (
    event: FormEvent<HTMLFormElement>,
    areaId: string,
    lineId: string,
  ) => {
    event.preventDefault();
    setError(null);
    setSavingLineId(lineId);
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      try {
        await overridePricingLineAction(customerId, quoteId, areaId, lineId, formData);
        router.refresh();
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : "Failed to override pricing line");
      } finally {
        setSavingLineId(null);
      }
    });
  };

  const clearLineOverride = (areaId: string, lineId: string) => {
    setError(null);
    setSavingLineId(lineId);
    const formData = new FormData();
    formData.set("overridePrice", "");
    formData.set("overrideReason", "");
    startTransition(async () => {
      try {
        await overridePricingLineAction(customerId, quoteId, areaId, lineId, formData);
        router.refresh();
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : "Failed to clear pricing override");
      } finally {
        setSavingLineId(null);
      }
    });
  };

  const areaDisplays = new Map(
    areas.map((area) => {
      const currentSelection = pickOf(area.id);
      const estimate = estimateLines(currentSelection, area.measurementTotals, itemsByGroup);
      const liveTotal = estimate.reduce((sum, line) => sum + line.totalCents, 0);
      return [
        area.id,
        {
          estimate,
          liveTotal,
          savedTotal: savedLinesTotal(area.lines),
          displayTotal: displayedAreaTotal({
            persistedSelection: area.selection,
            currentSelection,
            lines: area.lines,
            liveTotalCents: liveTotal,
          }),
          isSaved: isAreaSaved({
            persistedSelection: area.selection,
            currentSelection,
            lines: area.lines,
          }),
        },
      ] as const;
    }),
  );

  const grandTotal = Array.from(areaDisplays.values()).reduce(
    (sum, display) => sum + display.displayTotal,
    0,
  );
  const slabUseCounts = new Map<string, number>();
  for (const pick of Object.values(picks)) {
    if (pick.materialSource === "inventory" && pick.materialSlabId) {
      slabUseCounts.set(pick.materialSlabId, (slabUseCounts.get(pick.materialSlabId) ?? 0) + 1);
    }
  }

  if (areas.length === 0) {
    return <p className="text-sm text-muted-foreground">Add an area before pricing.</p>;
  }

  return (
    <div className="space-y-3">
      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {areas.map((area) => {
        const isOpen = openId === area.id;
        const p = pickOf(area.id);
        const display = areaDisplays.get(area.id);
        const isSaved = display?.isSaved ?? false;
        const estimate = display?.estimate ?? [];
        const liveTotal = display?.liveTotal ?? 0;
        const displayTotal = display?.displayTotal ?? 0;
        const selectedSlabUseCount = p.materialSlabId ? slabUseCounts.get(p.materialSlabId) ?? 0 : 0;
        const missingInventorySlab = p.materialItemId !== null && p.materialSource === "inventory" && p.materialSlabId === null;

        return (
          <div key={area.id} className="overflow-hidden rounded-lg border bg-card">
            <button
              type="button"
              onClick={() => setOpenId(isOpen ? null : area.id)}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted/50"
            >
              <div className="flex items-center gap-3">
                <span className={`grid h-6 w-6 place-items-center rounded-full text-xs font-bold ${isSaved ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground"}`}>
                  {isSaved ? "✓" : "•"}
                </span>
                <div>
                  <div className="font-medium">{area.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {num(area.measurementTotals.combinedSqFt)} sq ft · {num(area.measurementTotals.finishedEdgeLinFt)} lin ft · {area.measurementTotals.sinkCutoutCount} sink · {area.measurementTotals.faucetHoleCount} faucet
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold">{money(displayTotal)}</span>
                <span className="text-muted-foreground">{isOpen ? "▲" : "▼"}</span>
              </div>
            </button>

            {isOpen && (
              <div className="border-t bg-muted/30 p-4">
                {!isDraft ? (
                  <p className="text-sm text-muted-foreground">This quote is not a draft, so pricing is locked.</p>
                ) : (
                  <>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {GROUP_FIELDS.map(({ group, field, label }) => (
                        <label key={field} className="block text-sm">
                          <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
                          <Select value={p[field] ?? ""} onChange={(event) => setField(area.id, field, event.target.value)}>
                            <option value="">None</option>
                            {itemsByGroup[group].map((item) => (
                              <option key={item.id} value={item.id}>{item.name} — {money(item.priceCents)}</option>
                            ))}
                          </Select>
                        </label>
                      ))}
                    </div>

                    {p.materialItemId && (
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <label className="block text-sm">
                          <span className="mb-1 block text-xs font-medium text-muted-foreground">Material Source</span>
                          <Select value={p.materialSource} onChange={(event) => setMaterialSource(area.id, event.target.value as AreaSelection["materialSource"])}>
                            <option value="external">External</option>
                            <option value="inventory">Inventory</option>
                          </Select>
                        </label>

                        {p.materialSource === "inventory" ? (
                          <label className="block text-sm">
                            <span className="mb-1 block text-xs font-medium text-muted-foreground">Candidate Slab</span>
                            <Select value={p.materialSlabId ?? ""} onChange={(event) => setField(area.id, "materialSlabId", event.target.value)}>
                              <option value="">None</option>
                              {materialSlabs.map((slab) => (
                                <option key={slab.id} value={slab.id}>{slabLabel(slab)}</option>
                              ))}
                            </Select>
                          </label>
                        ) : (
                          <label className="block text-sm">
                            <span className="mb-1 block text-xs font-medium text-muted-foreground">External Material Note</span>
                            <Input value={p.externalMaterialNote ?? ""} onChange={(event) => setField(area.id, "externalMaterialNote", event.target.value)} placeholder="Supplier, color, or order note" />
                          </label>
                        )}

                        {selectedSlabUseCount > 1 && (
                          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 sm:col-span-2">
                            Multiple Areas use this Slab. Confirm layout fit before approval.
                          </div>
                        )}
                      </div>
                    )}

                    <div className="mt-3 rounded-md border bg-card p-3">
                      <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Live estimate</div>
                      {estimate.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Pick items to see an estimate.</p>
                      ) : (
                        estimate.map((line, index) => (
                          <div key={index} className="flex justify-between py-0.5 text-sm">
                            <span className="text-muted-foreground">{line.label} — {num(line.qty)} {line.unit} × {money(line.rateCents)}</span>
                            <span className="font-medium">{money(line.totalCents)}</span>
                          </div>
                        ))
                      )}
                      <div className="mt-1 flex justify-between border-t pt-1 text-sm font-semibold">
                        <span>{area.name} estimate</span><span>{money(liveTotal)}</span>
                      </div>
                    </div>

                    {area.lines.length > 0 && (
                      <div className="mt-3 rounded-md border bg-card p-3">
                        <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Saved pricing</div>
                        <div className="space-y-3">
                          {area.lines.map((line) => {
                            const activeTotal = line.overridePriceCents ?? line.lineTotalCents;
                            const lineSaving = isPending && savingLineId === line.id;

                            return (
                              <form
                                key={line.id}
                                onSubmit={(event) => saveLineOverride(event, area.id, line.id)}
                                className="grid gap-2 border-t pt-3 first:border-t-0 first:pt-0 lg:grid-cols-[minmax(0,1fr)_9rem_minmax(10rem,1fr)_auto]"
                              >
                                <div className="min-w-0">
                                  <div className="truncate text-sm font-medium">{line.label}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {num(line.quantity)} {line.unit} x {money(line.unitPriceCents)} = {money(line.lineTotalCents)}
                                  </div>
                                  {line.overridePriceCents !== null && (
                                    <div className="mt-1 text-xs font-medium text-amber-700">
                                      Override: {money(activeTotal)}
                                    </div>
                                  )}
                                </div>
                                <label className="block text-sm">
                                  <span className="mb-1 block text-xs font-medium text-muted-foreground">Manual price</span>
                                  <Input
                                    name="overridePrice"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    defaultValue={dollars(line.overridePriceCents)}
                                  />
                                </label>
                                <label className="block text-sm">
                                  <span className="mb-1 block text-xs font-medium text-muted-foreground">Reason</span>
                                  <Input
                                    name="overrideReason"
                                    defaultValue={line.overrideReason ?? ""}
                                    placeholder="Customer discount, rounded price"
                                  />
                                </label>
                                <div className="flex items-end gap-2">
                                  <Button type="submit" disabled={lineSaving}>
                                    {lineSaving ? "Saving…" : "Save"}
                                  </Button>
                                  {line.overridePriceCents !== null && (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      disabled={lineSaving}
                                      onClick={() => clearLineOverride(area.id, line.id)}
                                    >
                                      Clear
                                    </Button>
                                  )}
                                </div>
                              </form>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className="mt-3 flex justify-end">
                      <Button type="button" onClick={() => saveArea(area)} disabled={(isPending && savingId === area.id) || missingInventorySlab}>
                        {isPending && savingId === area.id ? "Saving…" : isSaved ? "Re-save area" : "Save area"}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}

      <div className="flex items-center justify-between rounded-lg border bg-card p-4">
        <span className="text-sm text-muted-foreground">
          {Array.from(areaDisplays.values()).filter((display) => display.isSaved).length} of {areas.length} areas saved
        </span>
        <span className="text-lg font-bold">Grand Total: {money(grandTotal)}</span>
      </div>
    </div>
  );
}
