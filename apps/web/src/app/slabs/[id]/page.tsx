import Link from 'next/link';
import { cookies } from 'next/headers';
import { Button } from '@/components/ui/button';
import { getApiClientWithAuth } from '@/lib/api';
import { archiveSlabAction, deleteSlabImageAction, uploadSlabImageAction } from '../_actions';

const dollars = (cents: number) => `$${(cents / 100).toFixed(2)}`;

const statusClasses: Record<string, string> = {
  available: 'bg-green-100 text-green-800',
  reserved: 'bg-yellow-100 text-yellow-800',
  cut: 'bg-blue-100 text-blue-800',
  remnant: 'bg-purple-100 text-purple-800',
  hold: 'bg-red-100 text-red-800',
  archived: 'bg-slate-100 text-slate-700',
};

const labelize = (value: string | null | undefined) => value ? value.replace(/_/g, ' ') : 'None';

const getDamageMarks = async (slabId: string) => {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('better-auth.session_token');
  const baseUrl = process.env.API_BASE_URL;
  if (!baseUrl) return [];
  const headers: Record<string, string> = {};
  if (sessionCookie) headers.Cookie = `better-auth.session_token=${sessionCookie.value}`;
  const response = await fetch(`${new URL(baseUrl).origin}/api/v1/inventory/slabs/${slabId}/damage-marks`, {
    headers,
    cache: 'no-store',
  });
  if (!response.ok) return [];
  const body = await response.json() as { data?: Array<Record<string, unknown>> };
  return body.data ?? [];
};

export default async function SlabDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = await getApiClientWithAuth();
  const { data, error } = await client.GET('/inventory/slabs/{slabId}', {
    params: { path: { slabId: id } },
  });

  if (error || !data) return <div className="text-red-600">Failed to load slab: {JSON.stringify(error)}</div>;
  const slab = data as any;
  const damageMarks = await getDamageMarks(id);
  const canEdit = slab.status === 'available' || slab.status === 'remnant';
  const uploadWithId = uploadSlabImageAction.bind(null, id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{slab.stoneType}</h2>
          <p className="text-sm text-muted-foreground">
            {slab.finish} · Grade {slab.qualityGrade}
          </p>
        </div>
        <div className="flex gap-2">
          {canEdit && <Button asChild variant="outline"><Link href={`/slabs/${id}/edit`}>Edit</Link></Button>}
          {canEdit && <form action={archiveSlabAction.bind(null, id)}><Button type="submit" variant="outline">Archive</Button></form>}
        </div>
      </div>

      <section className="rounded-md border p-4">
        <h3 className="mb-3 text-lg font-semibold">Info</h3>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div><dt className="text-muted-foreground">Stone Type</dt><dd>{slab.stoneType}</dd></div>
          <div><dt className="text-muted-foreground">Tag</dt><dd>{slab.tagCode ?? 'None'}</dd></div>
          <div><dt className="text-muted-foreground">Kind</dt><dd className="capitalize">{labelize(slab.kind)}</dd></div>
          <div><dt className="text-muted-foreground">Availability</dt><dd><span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium capitalize ${statusClasses[slab.availability ?? slab.status] ?? statusClasses.available}`}>{labelize(slab.availability ?? slab.status)}</span></dd></div>
          <div><dt className="text-muted-foreground">Ownership</dt><dd className="capitalize">{labelize(slab.ownership)}</dd></div>
          <div><dt className="text-muted-foreground">Condition</dt><dd className="capitalize">{labelize(slab.condition)}</dd></div>
          <div><dt className="text-muted-foreground">Finish</dt><dd className="capitalize">{slab.finish}</dd></div>
          <div><dt className="text-muted-foreground">Grade</dt><dd>{slab.qualityGrade}</dd></div>
          <div><dt className="text-muted-foreground">Length</dt><dd>{slab.lengthIn.toFixed(3)} in</dd></div>
          <div><dt className="text-muted-foreground">Width</dt><dd>{slab.widthIn.toFixed(3)} in</dd></div>
          <div><dt className="text-muted-foreground">Thickness</dt><dd>{slab.thicknessCm.toFixed(1)} cm</dd></div>
          <div><dt className="text-muted-foreground">Sq Ft</dt><dd>{((slab.lengthIn * slab.widthIn) / 144).toFixed(2)}</dd></div>
          <div><dt className="text-muted-foreground">Cost</dt><dd>{dollars(slab.costCents)}</dd></div>
          <div><dt className="text-muted-foreground">Warehouse Location</dt><dd>{slab.warehouseLocation ?? 'None'}</dd></div>
          <div><dt className="text-muted-foreground">Material Color ID</dt><dd>{slab.materialColorId ?? 'None'}</dd></div>
          <div><dt className="text-muted-foreground">Storage Location ID</dt><dd>{slab.storageLocationId ?? 'None'}</dd></div>
          <div><dt className="text-muted-foreground">Receipt ID</dt><dd>{slab.inventoryReceiptId ?? 'None'}</dd></div>
          <div><dt className="text-muted-foreground">Hold Reason</dt><dd>{slab.holdReason ?? 'None'}</dd></div>
          <div><dt className="text-muted-foreground">Lot Number</dt><dd>{slab.lotNumber ?? 'None'}</dd></div>
          <div><dt className="text-muted-foreground">Bundle Number</dt><dd>{slab.bundleNumber ?? 'None'}</dd></div>
          <div><dt className="text-muted-foreground">Parent Slab</dt><dd>{slab.parentSlabId ?? 'None'}</dd></div>
          <div><dt className="text-muted-foreground">Archived At</dt><dd>{slab.archivedAt ? new Date(slab.archivedAt).toLocaleString() : 'None'}</dd></div>
          <div><dt className="text-muted-foreground">Created</dt><dd>{new Date(slab.createdAt).toLocaleString()}</dd></div>
          <div><dt className="text-muted-foreground">Updated</dt><dd>{new Date(slab.updatedAt).toLocaleString()}</dd></div>
          <div className="col-span-2"><dt className="text-muted-foreground">Notes</dt><dd>{slab.notes ?? 'None'}</dd></div>
        </dl>
      </section>

      <section className="rounded-md border p-4">
        <h3 className="mb-3 text-lg font-semibold">Damage Marks</h3>
        {damageMarks.length > 0 ? (
          <div className="space-y-2 text-sm">
            {damageMarks.map((mark) => (
              <div key={String(mark.id)} className="rounded border px-3 py-2">
                <div className="font-medium capitalize">{labelize(mark.type as string)} · {labelize(mark.severity as string)}</div>
                <div className="text-muted-foreground">{(mark.note as string | null) ?? 'No note'}</div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No damage marks recorded.</p>
        )}
      </section>

      <section className="rounded-md border p-4">
        <h3 className="mb-3 text-lg font-semibold">Photos</h3>
        {slab.imageUrls && slab.imageUrls.length > 0 ? (
          <div className="mb-4 flex flex-wrap gap-3">
            {(slab.imageUrls as string[]).map((url: string) => (
              <div key={url} className="group relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt="Slab photo"
                  className="h-40 w-40 rounded object-cover"
                />
                <form action={deleteSlabImageAction.bind(null, id, url)} className="absolute right-1 top-1 opacity-0 group-hover:opacity-100">
                  <button
                    type="submit"
                    className="rounded bg-red-600 px-2 py-0.5 text-xs text-white hover:bg-red-700"
                  >
                    ✕
                  </button>
                </form>
              </div>
            ))}
          </div>
        ) : (
          <p className="mb-4 text-sm text-muted-foreground">No photos yet.</p>
        )}
        <form action={uploadWithId} className="flex items-center gap-3">
          <input
            type="file"
            name="image"
            accept="image/*"
            required
            className="text-sm text-muted-foreground file:mr-3 file:rounded file:border-0 file:bg-muted file:px-3 file:py-1 file:text-sm"
          />
          <Button type="submit" size="sm" variant="outline">Upload</Button>
        </form>
      </section>
    </div>
  );
}
