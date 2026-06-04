'use client';

import { useMemo, useRef, useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import {
  damageMarkSeverities,
  damageMarkTypes,
  type DamageMarkSeverity,
  type DamageMarkType,
} from '../damage-mark-payload';
import {
  dragToNormalizedCircle,
  pointToNormalizedCircle,
  type CircleDamageShape,
  type Point,
} from '../damage-mark-geometry';

interface DamageMark {
  id: string;
  type: DamageMarkType;
  severity: DamageMarkSeverity;
  shape: {
    kind: string;
    x?: number;
    y?: number;
    radius?: number;
  };
  note?: string | null;
}

interface DamageMarkerProps {
  imageUrl: string;
  marks: DamageMark[];
  saveAction: (formData: FormData) => void | Promise<void>;
}

const markClasses: Record<DamageMarkType, string> = {
  scratch: 'border-yellow-400 bg-yellow-400/15',
  chip: 'border-orange-500 bg-orange-500/15',
  crack: 'border-red-600 bg-red-600/15',
  stain: 'border-blue-500 bg-blue-500/15',
  other: 'border-slate-500 bg-slate-500/15',
};

const labelize = (value: string) => value.replace(/_/g, ' ');

export function DamageMarker({ imageUrl, marks, saveAction }: DamageMarkerProps) {
  const imageRef = useRef<HTMLImageElement>(null);
  const [type, setType] = useState<DamageMarkType>('scratch');
  const [severity, setSeverity] = useState<DamageMarkSeverity>('minor');
  const [shape, setShape] = useState<CircleDamageShape | null>(null);
  const [dragStart, setDragStart] = useState<Point | null>(null);
  const [isPending, startTransition] = useTransition();

  const shapeValue = useMemo(() => (shape ? JSON.stringify(shape) : ''), [shape]);

  const markAt = (point: Point) => {
    const rect = imageRef.current?.getBoundingClientRect();
    if (!rect) return;
    setShape(pointToNormalizedCircle(point, rect));
  };

  const dragMarkTo = (point: Point) => {
    const rect = imageRef.current?.getBoundingClientRect();
    if (!rect || !dragStart) return;
    setShape(dragToNormalizedCircle(dragStart, point, rect));
  };

  return (
    <div className="space-y-3">
      <div
        className="relative inline-block touch-none"
        onPointerDown={(event) => {
          const point = { x: event.clientX, y: event.clientY };
          setDragStart(point);
          markAt(point);
        }}
        onPointerMove={(event) => {
          if (event.buttons !== 1) return;
          dragMarkTo({ x: event.clientX, y: event.clientY });
        }}
        onPointerUp={(event) => {
          if (dragStart) dragMarkTo({ x: event.clientX, y: event.clientY });
          setDragStart(null);
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imageRef}
          src={imageUrl}
          alt="Slab photo"
          className="max-h-[420px] max-w-full rounded border object-contain"
          draggable={false}
        />
        {marks.map((mark) => {
          if (mark.shape.kind !== 'circle' || mark.shape.x === undefined || mark.shape.y === undefined || mark.shape.radius === undefined) {
            return null;
          }

          return (
            <div
              key={mark.id}
              title={`${labelize(mark.type)} ${mark.note ?? ''}`}
              className={`pointer-events-none absolute rounded-full border-2 ${markClasses[mark.type]}`}
              style={{
                left: `${(mark.shape.x - mark.shape.radius) * 100}%`,
                top: `${(mark.shape.y - mark.shape.radius) * 100}%`,
                width: `${mark.shape.radius * 200}%`,
                height: `${mark.shape.radius * 200}%`,
              }}
            />
          );
        })}
        {shape && (
          <div
            className={`pointer-events-none absolute rounded-full border-2 border-dashed ${markClasses[type]}`}
            style={{
              left: `${(shape.x - shape.radius) * 100}%`,
              top: `${(shape.y - shape.radius) * 100}%`,
              width: `${shape.radius * 200}%`,
              height: `${shape.radius * 200}%`,
            }}
          />
        )}
      </div>

      <form
        action={(formData) => {
          startTransition(async () => {
            await saveAction(formData);
            setShape(null);
          });
        }}
        className="grid gap-3 rounded-md border p-3 md:grid-cols-[1fr_1fr_2fr_auto]"
      >
        <input type="hidden" name="shape" value={shapeValue} />
        <div className="space-y-1">
          <Label htmlFor={`damage-type-${imageUrl}`}>Type</Label>
          <Select id={`damage-type-${imageUrl}`} name="type" value={type} onChange={(event) => setType(event.target.value as DamageMarkType)}>
            {damageMarkTypes.map((value) => (
              <option key={value} value={value}>{labelize(value)}</option>
            ))}
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor={`damage-severity-${imageUrl}`}>Severity</Label>
          <Select id={`damage-severity-${imageUrl}`} name="severity" value={severity} onChange={(event) => setSeverity(event.target.value as DamageMarkSeverity)}>
            {damageMarkSeverities.map((value) => (
              <option key={value} value={value}>{labelize(value)}</option>
            ))}
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor={`damage-note-${imageUrl}`}>Note</Label>
          <Input id={`damage-note-${imageUrl}`} name="note" placeholder="Optional note" />
        </div>
        <div className="flex items-end gap-2">
          <Button type="submit" size="sm" disabled={!shape || isPending}>
            {isPending ? 'Saving...' : 'Save Mark'}
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => setShape(null)} disabled={!shape || isPending}>
            Clear
          </Button>
        </div>
      </form>
    </div>
  );
}
