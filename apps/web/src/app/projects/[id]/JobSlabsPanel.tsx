import type { components } from '@stoneboyz/api-client';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { getApiClientWithAuth } from '@/lib/api';
import { detachSlabFromJobAction, linkSlabToJobAction } from './_actions';
import { AddMaterialSearch } from './AddMaterialSearch';
import { ReassignForm } from './ReassignForm';

type Slab = components['schemas']['Slab'];

const labelize = (value: string) => value.replace(/_/g, ' ');
const MANAGER_ROLES = new Set(['admin', 'inventory_manager']);

interface JobSlabsPanelProps {
  customerId: string;
  projectId: string;
}

const dims = (slab: Slab) => `${slab.lengthIn}" × ${slab.widthIn}"`;
const isRestricted = (ownership: string) =>
  ownership === 'job_purchased' || ownership === 'customer_supplied';

export async function JobSlabsPanel({ customerId, projectId }: JobSlabsPanelProps) {
  const client = await getApiClientWithAuth();

  const { data: linkedRes } = await client.GET('/customers/{customerId}/projects/{projectId}/slabs', {
    params: { path: { customerId, projectId } },
  });
  const linked = linkedRes?.data ?? [];
  const linkedIds = new Set(linked.map((slab) => slab.id));

  const { data: materialRes } = await client.GET('/inventory/slabs', {
    params: { query: { availability: 'available', ownerCustomerId: customerId } },
  });
  const customerMaterial = (materialRes?.data ?? []).filter((slab) => !linkedIds.has(slab.id));

  const { data: me } = await client.GET('/users/me', {});
  const isManager = MANAGER_ROLES.has((me as { role?: string } | undefined)?.role ?? '');

  const { data: customersRes } = await client.GET('/customers', {});
  const customers = (customersRes?.data ?? []).map((customer) => ({ id: customer.id, name: customer.name }));

  return (
    <section className="space-y-4">
      <AddMaterialSearch customerId={customerId} projectId={projectId} />

      <div>
        <h3 className="text-lg font-semibold">Linked to this Job ({linked.length})</h3>
        {linked.length > 0 ? (
          <ul className="mt-2 space-y-2">
            {linked.map((slab) => (
              <li key={slab.id} className="flex flex-wrap items-start justify-between gap-3 rounded-md border px-3 py-2 text-sm">
                <div className="min-w-0">
                  <Link href={`/slabs/${slab.id}`} className="font-medium underline-offset-2 hover:underline">
                    {slab.tagCode ?? slab.id.slice(0, 8)}
                  </Link>
                  <span className="ml-2 text-muted-foreground">
                    {slab.stoneType} · {dims(slab)} · <span className="capitalize">{labelize(slab.ownership)}</span> · <span className="capitalize">{labelize(slab.availability)}</span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {isRestricted(slab.ownership) ? (
                    <span className="text-xs text-muted-foreground">Release to shop stock to free</span>
                  ) : (
                    <form action={detachSlabFromJobAction.bind(null, customerId, projectId, slab.id)}>
                      <Button type="submit" size="sm" variant="outline">Detach</Button>
                    </form>
                  )}
                  {isManager && (
                    <ReassignForm
                      customers={customers}
                      sourceCustomerId={customerId}
                      sourceProjectId={projectId}
                      slabId={slab.id}
                      ownership={slab.ownership}
                    />
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">No slabs linked to this job yet.</p>
        )}
      </div>

      <div>
        <h3 className="text-lg font-semibold">This customer&apos;s material, not yet linked ({customerMaterial.length})</h3>
        {customerMaterial.length > 0 ? (
          <ul className="mt-2 space-y-2">
            {customerMaterial.map((slab) => (
              <li key={slab.id} className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm">
                <div>
                  <Link href={`/slabs/${slab.id}`} className="font-medium underline-offset-2 hover:underline">
                    {slab.tagCode ?? slab.id.slice(0, 8)}
                  </Link>
                  <span className="ml-2 text-muted-foreground">{slab.stoneType} · {dims(slab)}</span>
                </div>
                <form action={linkSlabToJobAction.bind(null, customerId, projectId, slab.id)}>
                  <Button type="submit" size="sm" variant="outline">Link</Button>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">No unlinked material for this customer.</p>
        )}
      </div>
    </section>
  );
}
