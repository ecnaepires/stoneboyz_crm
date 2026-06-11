import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { getApiClientWithAuth } from '@/lib/api';
import { updateSlabAction } from '../../_actions';
import { SlabValueFields } from '../../slab-value-fields';

export default async function EditSlabPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = await getApiClientWithAuth();
  const { data: slab, error } = await client.GET('/inventory/slabs/{slabId}', {
    params: { path: { slabId: id } },
  });

  if (error || !slab) return <div className="text-red-600">Failed to load slab: {JSON.stringify(error)}</div>;
  if (slab.status !== 'available' && slab.status !== 'remnant') {
    return <div className="text-red-600">Cannot edit slab with status: {slab.status}</div>;
  }
  const sqFt = (slab.lengthIn * slab.widthIn) / 144;
  const valuePerSqFt = sqFt > 0 ? slab.costCents / 100 / sqFt : 0;

  return (
    <div className="max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold">Edit Slab</h2>
        <Button asChild variant="outline"><Link href={`/slabs/${id}`}>Cancel</Link></Button>
      </div>
      <form action={updateSlabAction.bind(null, id)} className="space-y-4">
        <input name="stoneType" required defaultValue={slab.stoneType} className="h-10 w-full rounded-md border px-3 text-sm" />
        <div className="grid grid-cols-2 gap-4">
          <Select name="finish" required defaultValue={slab.finish} className="h-10">
            <option value="polished">Polished</option>
            <option value="honed">Honed</option>
            <option value="brushed">Brushed</option>
            <option value="leathered">Leathered</option>
            <option value="sandblasted">Sandblasted</option>
          </Select>
          <Select name="qualityGrade" required defaultValue={slab.qualityGrade} className="h-10">
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="C">C</option>
          </Select>
          <SlabValueFields
            defaultLengthIn={slab.lengthIn}
            defaultWidthIn={slab.widthIn}
            defaultThicknessCm={slab.thicknessCm}
            defaultValuePerSqFt={Number(valuePerSqFt.toFixed(2))}
          />
          <input name="lotNumber" defaultValue={slab.lotNumber ?? ''} className="h-10 rounded-md border px-3 text-sm" />
          <input name="bundleNumber" defaultValue={slab.bundleNumber ?? ''} className="h-10 rounded-md border px-3 text-sm" />
        </div>
        <input name="warehouseLocation" defaultValue={slab.warehouseLocation ?? ''} className="h-10 w-full rounded-md border px-3 text-sm" />
        <textarea name="notes" defaultValue={slab.notes ?? ''} className="min-h-24 w-full rounded-md border px-3 py-2 text-sm" />
        <Button type="submit">Save Slab</Button>
      </form>
    </div>
  );
}
