import Link from 'next/link';
import { cookies } from 'next/headers';
import { Button } from '@/components/ui/button';

const apiGet = async (path: string) => {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('better-auth.session_token');
  const baseUrl = process.env.API_BASE_URL;
  if (!baseUrl) return { data: [] };
  const headers: Record<string, string> = {};
  if (sessionCookie) headers.Cookie = `better-auth.session_token=${sessionCookie.value}`;
  const response = await fetch(`${new URL(baseUrl).origin}${path}`, { headers, cache: 'no-store' });
  if (!response.ok) return { data: [] };
  return response.json() as Promise<{ data?: Array<Record<string, any>> }>;
};

const labelize = (value: string | null | undefined) => value ? value.replace(/_/g, ' ') : '-';

export default async function FindMaterialPage({
  searchParams,
}: {
  searchParams?: Promise<{ minLengthIn?: string; minWidthIn?: string; kind?: string }>;
}) {
  const params = await searchParams;
  const query = new URLSearchParams();
  if (params?.minLengthIn) query.set('minLengthIn', params.minLengthIn);
  if (params?.minWidthIn) query.set('minWidthIn', params.minWidthIn);
  if (params?.kind) query.set('kind', params.kind);
  const hasSearch = query.has('minLengthIn') && query.has('minWidthIn');
  const results = hasSearch ? (await apiGet(`/api/v1/inventory/slabs/find-material?${query.toString()}`)).data ?? [] : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Find Material</h2>
          <p className="text-sm text-muted-foreground">Search slabs and remnants by needed piece size.</p>
        </div>
        <Button asChild variant="outline"><Link href="/slabs">Back to Inventory</Link></Button>
      </div>

      <form className="grid max-w-3xl grid-cols-4 gap-3 rounded-md border p-4">
        <input name="minLengthIn" defaultValue={params?.minLengthIn ?? ''} required type="number" step="0.001" placeholder="Min Length (in)" className="h-10 rounded-md border px-3 text-sm" />
        <input name="minWidthIn" defaultValue={params?.minWidthIn ?? ''} required type="number" step="0.001" placeholder="Min Width (in)" className="h-10 rounded-md border px-3 text-sm" />
        <select name="kind" defaultValue={params?.kind ?? ''} className="h-10 rounded-md border px-3 text-sm">
          <option value="">Any kind</option>
          <option value="full_slab">Full slabs</option>
          <option value="remnant">Remnants</option>
        </select>
        <Button type="submit">Search</Button>
      </form>

      <div className="rounded-md border">
        <div className="border-b px-4 py-3 text-sm font-semibold">Matches</div>
        <div className="divide-y">
          {results.length === 0 ? (
            <div className="px-4 py-6 text-sm text-muted-foreground">No matches yet.</div>
          ) : (
            results.map((slab) => (
              <Link key={String(slab.id)} href={`/slabs/${slab.id}`} className="grid grid-cols-5 gap-3 px-4 py-3 text-sm hover:bg-muted">
                <span className="font-medium">{slab.tagCode ?? slab.stoneType}</span>
                <span>{slab.lengthIn} x {slab.widthIn}</span>
                <span className="capitalize">{labelize(slab.kind)}</span>
                <span className="capitalize">{labelize(slab.condition)}</span>
                <span>{slab.fitsRotated ? 'Fits rotated' : 'Fits'}</span>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
