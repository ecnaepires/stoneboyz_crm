import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { getApiClientWithAuth } from '@/lib/api';
import { archiveSlabAction, deleteSlabImageAction, uploadSlabImageAction } from '../_actions';

const dollars = (cents: number) => `$${(cents / 100).toFixed(2)}`;

const statusClasses: Record<'available' | 'reserved' | 'cut' | 'remnant', string> = {
  available: 'bg-green-100 text-green-800',
  reserved: 'bg-yellow-100 text-yellow-800',
  cut: 'bg-blue-100 text-blue-800',
  remnant: 'bg-purple-100 text-purple-800',
};

export default async function SlabDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = await getApiClientWithAuth();
  const { data: slab, error } = await client.GET('/inventory/slabs/{slabId}', {
    params: { path: { slabId: id } },
  });

  if (error || !slab) return <div className="text-red-600">Failed to load slab: {JSON.stringify(error)}</div>;
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
          <div><dt className="text-muted-foreground">Status</dt><dd><span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium capitalize ${statusClasses[slab.status]}`}>{slab.status}</span></dd></div>
          <div><dt className="text-muted-foreground">Finish</dt><dd className="capitalize">{slab.finish}</dd></div>
          <div><dt className="text-muted-foreground">Grade</dt><dd>{slab.qualityGrade}</dd></div>
          <div><dt className="text-muted-foreground">Length</dt><dd>{slab.lengthIn.toFixed(3)} in</dd></div>
          <div><dt className="text-muted-foreground">Width</dt><dd>{slab.widthIn.toFixed(3)} in</dd></div>
          <div><dt className="text-muted-foreground">Thickness</dt><dd>{slab.thicknessCm.toFixed(1)} cm</dd></div>
          <div><dt className="text-muted-foreground">Sq Ft</dt><dd>{((slab.lengthIn * slab.widthIn) / 144).toFixed(2)}</dd></div>
          <div><dt className="text-muted-foreground">Cost</dt><dd>{dollars(slab.costCents)}</dd></div>
          <div><dt className="text-muted-foreground">Warehouse Location</dt><dd>{slab.warehouseLocation ?? 'None'}</dd></div>
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
        <h3 className="mb-3 text-lg font-semibold">Photos</h3>
        {slab.imageUrls && slab.imageUrls.length > 0 ? (
          <div className="mb-4 flex flex-wrap gap-3">
            {slab.imageUrls.map((url) => (
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
        <form action={uploadWithId} encType="multipart/form-data" className="flex items-center gap-3">
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
