"use client";

import { useMemo, useState } from "react";

interface SlabValueFieldsProps {
  defaultLengthIn?: number;
  defaultWidthIn?: number;
  defaultThicknessCm?: number;
  defaultValuePerSqFt?: number;
}

const parseNumber = (value: string) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const money = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);

export function SlabValueFields({
  defaultLengthIn,
  defaultWidthIn,
  defaultThicknessCm,
  defaultValuePerSqFt,
}: SlabValueFieldsProps) {
  const [lengthIn, setLengthIn] = useState(String(defaultLengthIn ?? ""));
  const [widthIn, setWidthIn] = useState(String(defaultWidthIn ?? ""));
  const [valuePerSqFt, setValuePerSqFt] = useState(
    defaultValuePerSqFt === undefined ? "" : String(defaultValuePerSqFt),
  );

  const total = useMemo(() => {
    const sqFt = (parseNumber(lengthIn) * parseNumber(widthIn)) / 144;
    return sqFt * parseNumber(valuePerSqFt);
  }, [lengthIn, valuePerSqFt, widthIn]);

  return (
    <>
      <input
        name="lengthIn"
        type="number"
        step="0.001"
        required
        placeholder="Length (in)"
        value={lengthIn}
        onChange={(event) => setLengthIn(event.target.value)}
        className="h-10 rounded-md border px-3 text-sm"
      />
      <input
        name="widthIn"
        type="number"
        step="0.001"
        required
        placeholder="Width (in)"
        value={widthIn}
        onChange={(event) => setWidthIn(event.target.value)}
        className="h-10 rounded-md border px-3 text-sm"
      />
      <input
        name="thicknessCm"
        type="number"
        step="1"
        required
        defaultValue={defaultThicknessCm}
        placeholder="Thickness (cm)"
        className="h-10 rounded-md border px-3 text-sm"
      />
      <input
        name="valuePerSqFt"
        type="number"
        step="0.01"
        min="0"
        required
        placeholder="Value per square foot"
        value={valuePerSqFt}
        onChange={(event) => setValuePerSqFt(event.target.value)}
        className="h-10 rounded-md border px-3 text-sm"
      />
      <input
        type="text"
        readOnly
        tabIndex={-1}
        value={money(total)}
        aria-label="Total slab value"
        className="h-10 rounded-md border bg-muted px-3 text-sm text-muted-foreground"
      />
    </>
  );
}
