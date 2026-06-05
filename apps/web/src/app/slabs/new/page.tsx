import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { getApiClientWithAuth } from '@/lib/api';
import { createSlabAction } from '../_actions';
import { OwnershipFields } from './OwnershipFields';

export default async function NewSlabPage() {
  const client = await getApiClientWithAuth();
  const { data } = await client.GET('/customers', {});
  const customers = (data?.data ?? []).map((customer) => ({ id: customer.id, name: customer.name }));

  return (
    <div className="max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold">New Slab</h2>
        <Button asChild variant="outline"><Link href="/slabs">Cancel</Link></Button>
      </div>
      <form action={createSlabAction} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Select name="kind" required defaultValue="full_slab" className="h-10">
            <option value="full_slab">Full slab</option>
            <option value="remnant">Remnant</option>
          </Select>
          <Select name="availability" required defaultValue="available" className="h-10">
            <option value="available">Available</option>
            <option value="reserved">Reserved</option>
            <option value="hold">Hold</option>
          </Select>
          <OwnershipFields customers={customers} />
          <Select name="condition" required defaultValue="good" className="h-10">
            <option value="good">Good</option>
            <option value="minor_damage">Minor damage</option>
            <option value="major_damage">Major damage</option>
          </Select>
        </div>
        <input name="tagCode" placeholder="Tag Code (auto if blank)" className="h-10 w-full rounded-md border px-3 text-sm" />
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
          <input name="lengthIn" type="number" step="0.001" required placeholder="Length (in)" className="h-10 rounded-md border px-3 text-sm" />
          <input name="widthIn" type="number" step="0.001" required placeholder="Width (in)" className="h-10 rounded-md border px-3 text-sm" />
          <input name="thicknessCm" type="number" step="0.1" required placeholder="Thickness (cm)" className="h-10 rounded-md border px-3 text-sm" />
          <input name="cost" type="number" step="0.01" min="0" defaultValue="0" placeholder="Cost ($)" className="h-10 rounded-md border px-3 text-sm" />
          <input name="lotNumber" placeholder="Lot Number" className="h-10 rounded-md border px-3 text-sm" />
          <input name="bundleNumber" placeholder="Bundle Number" className="h-10 rounded-md border px-3 text-sm" />
        </div>
        <input name="warehouseLocation" placeholder="Warehouse Location" className="h-10 w-full rounded-md border px-3 text-sm" />
        <div className="grid grid-cols-3 gap-4">
          <input name="materialColorId" placeholder="Material Color ID" className="h-10 rounded-md border px-3 text-sm" />
          <input name="storageLocationId" placeholder="Storage Location ID" className="h-10 rounded-md border px-3 text-sm" />
          <input name="inventoryReceiptId" placeholder="Receipt ID" className="h-10 rounded-md border px-3 text-sm" />
        </div>
        <input name="holdReason" placeholder="Hold Reason" className="h-10 w-full rounded-md border px-3 text-sm" />
        <textarea name="notes" placeholder="Notes" className="min-h-24 w-full rounded-md border px-3 py-2 text-sm" />
        <Button type="submit">Create Slab</Button>
      </form>
    </div>
  );
}
