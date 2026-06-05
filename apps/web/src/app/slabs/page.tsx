import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getApiClientWithAuth } from '@/lib/api';

const dollars = (cents: number) => `$${(cents / 100).toFixed(2)}`;
const squareFeet = (lengthIn: number, widthIn: number) => ((lengthIn * widthIn) / 144).toFixed(2);

const statusClasses: Record<string, string> = {
  available: 'bg-green-100 text-green-800',
  reserved: 'bg-yellow-100 text-yellow-800',
  cut: 'bg-blue-100 text-blue-800',
  remnant: 'bg-purple-100 text-purple-800',
  hold: 'bg-red-100 text-red-800',
  archived: 'bg-slate-100 text-slate-700',
};

const labelize = (value: string | null | undefined) => value ? value.replace(/_/g, ' ') : '-';

export default async function SlabsPage({ searchParams }: { searchParams?: Promise<{ kind?: string; availability?: string }> }) {
  const params = await searchParams;
  const client = await getApiClientWithAuth();
  const { data, error } = await client.GET('/inventory/slabs', {
    params: {
      query: {
        limit: 50,
        ...(params?.kind ? { kind: params.kind as any } : {}),
        ...(params?.availability ? { availability: params.availability as any } : {}),
      },
    },
  });

  if (error) return <div className="text-red-600">Failed to load slabs: {JSON.stringify(error)}</div>;
  const slabs = (data?.data ?? []) as Array<any>;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Inventory</h2>
          <p className="text-sm text-muted-foreground">Full slabs and remnants in one searchable yard view.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline"><Link href="/inventory/find-material">Find Material</Link></Button>
          <Button asChild><Link href="/slabs/new">Add Slab</Link></Button>
        </div>
      </div>
      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        <Button asChild variant={!params?.kind ? 'default' : 'outline'} size="sm"><Link href="/slabs">All</Link></Button>
        <Button asChild variant={params?.kind === 'full_slab' ? 'default' : 'outline'} size="sm"><Link href="/slabs?kind=full_slab">Slabs</Link></Button>
        <Button asChild variant={params?.kind === 'remnant' ? 'default' : 'outline'} size="sm"><Link href="/slabs?kind=remnant">Remnants</Link></Button>
        <Button asChild variant={params?.availability === 'hold' ? 'default' : 'outline'} size="sm"><Link href="/slabs?availability=hold">Holds</Link></Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tag</TableHead>
            <TableHead>Stone Type</TableHead>
            <TableHead>Kind</TableHead>
            <TableHead>Availability</TableHead>
            <TableHead>Ownership</TableHead>
            <TableHead>Condition</TableHead>
            <TableHead>Finish</TableHead>
            <TableHead>Grade</TableHead>
            <TableHead>Size (LxW in)</TableHead>
            <TableHead>Sq Ft</TableHead>
            <TableHead>Cost</TableHead>
            <TableHead>Warehouse Location</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {slabs.map((slab) => (
            <TableRow key={slab.id}>
              <TableCell>{slab.tagCode ?? '-'}</TableCell>
              <TableCell><Link href={`/slabs/${slab.id}`} className="font-medium text-primary hover:underline">{slab.stoneType}</Link></TableCell>
              <TableCell className="capitalize">{labelize(slab.kind)}</TableCell>
              <TableCell>
                <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium capitalize ${statusClasses[slab.availability ?? slab.status] ?? statusClasses.available}`}>
                  {labelize(slab.availability ?? slab.status)}
                </span>
              </TableCell>
              <TableCell className="capitalize">{labelize(slab.ownership)}</TableCell>
              <TableCell className="capitalize">{labelize(slab.condition)}</TableCell>
              <TableCell className="capitalize">{slab.finish}</TableCell>
              <TableCell>{slab.qualityGrade}</TableCell>
              <TableCell>{slab.lengthIn.toFixed(3)} x {slab.widthIn.toFixed(3)}</TableCell>
              <TableCell>{squareFeet(slab.lengthIn, slab.widthIn)}</TableCell>
              <TableCell>{dollars(slab.costCents)}</TableCell>
              <TableCell>{slab.warehouseLocation ?? 'None'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
