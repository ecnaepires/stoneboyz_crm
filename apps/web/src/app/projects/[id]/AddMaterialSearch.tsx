'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import {
  findMaterialForJobAction,
  linkSlabToJobAction,
  type FindMaterialRow,
} from './_actions';

interface AddMaterialSearchProps {
  customerId: string;
  projectId: string;
}

export function AddMaterialSearch({ customerId, projectId }: AddMaterialSearchProps) {
  const [open, setOpen] = useState(false);
  const [minLength, setMinLength] = useState('');
  const [minWidth, setMinWidth] = useState('');
  const [results, setResults] = useState<FindMaterialRow[]>([]);
  const [searched, setSearched] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
        Add material
      </Button>
    );
  }

  const search = () => {
    startTransition(async () => {
      const found = await findMaterialForJobAction(Number(minLength) || 0, Number(minWidth) || 0);
      setResults(found);
      setSearched(true);
    });
  };

  return (
    <div className="space-y-3 rounded-md border p-3">
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-xs text-muted-foreground">
          Min length (in)
          <input
            type="number"
            value={minLength}
            onChange={(event) => setMinLength(event.target.value)}
            className="mt-1 block h-9 w-28 rounded-md border px-2 text-sm"
          />
        </label>
        <label className="text-xs text-muted-foreground">
          Min width (in)
          <input
            type="number"
            value={minWidth}
            onChange={(event) => setMinWidth(event.target.value)}
            className="mt-1 block h-9 w-28 rounded-md border px-2 text-sm"
          />
        </label>
        <Button type="button" size="sm" onClick={search} disabled={pending}>
          {pending ? 'Searching…' : 'Search'}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => setOpen(false)}>Close</Button>
      </div>

      {searched && results.length === 0 && (
        <p className="text-sm text-muted-foreground">No available material fits those dimensions.</p>
      )}

      {results.length > 0 && (
        <ul className="space-y-2">
          {results.map((slab) => (
            <li key={slab.id} className="flex items-center justify-between gap-3 rounded border px-3 py-2 text-sm">
              <span>
                <span className="font-medium">{slab.tagCode ?? slab.id.slice(0, 8)}</span>
                <span className="ml-2 text-muted-foreground">
                  {slab.stoneType} · {slab.lengthIn}&quot; × {slab.widthIn}&quot; · <span className="capitalize">{slab.ownership.replace(/_/g, ' ')}</span>
                </span>
              </span>
              <form action={linkSlabToJobAction.bind(null, customerId, projectId, slab.id)}>
                <Button type="submit" size="sm" variant="outline">Link to this job</Button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
