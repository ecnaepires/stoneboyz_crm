import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { createSlabAction } from '../_actions';
import { SlabValueFields } from '../slab-value-fields';

export default function NewSlabPage() {
  return (
    <div className="max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold">New Slab</h2>
        <Button asChild variant="outline"><Link href="/slabs">Cancel</Link></Button>
      </div>
      <form action={createSlabAction} className="space-y-4">
        <input name="stoneType" required placeholder="Stone Type" className="h-10 w-full rounded-md border px-3 text-sm" />
        <div className="grid grid-cols-2 gap-4">
          <Select name="finish" required defaultValue="polished" className="h-10">
            <option value="polished">Polished</option>
            <option value="honed">Honed</option>
            <option value="brushed">Brushed</option>
            <option value="leathered">Leathered</option>
            <option value="sandblasted">Sandblasted</option>
          </Select>
          <Select name="qualityGrade" required defaultValue="A" className="h-10">
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="C">C</option>
          </Select>
          <SlabValueFields />
          <input name="lotNumber" placeholder="Lot Number" className="h-10 rounded-md border px-3 text-sm" />
          <input name="bundleNumber" placeholder="Bundle Number" className="h-10 rounded-md border px-3 text-sm" />
        </div>
        <input name="warehouseLocation" placeholder="Warehouse Location" className="h-10 w-full rounded-md border px-3 text-sm" />
        <textarea name="notes" placeholder="Notes" className="min-h-24 w-full rounded-md border px-3 py-2 text-sm" />
        <Button type="submit">Create Slab</Button>
      </form>
    </div>
  );
}
