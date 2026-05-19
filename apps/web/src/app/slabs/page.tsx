import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getApiClientWithAuth } from '@/lib/api';

const dollars = (cents: number) => `$${(cents / 100).toFixed(2)}`;
const squareFeet = (lengthIn: number, widthIn: number) => ((lengthIn * widthIn) / 144).toFixed(2);

const statusClasses: Record<'available' | 'reserved' | 'cut' | 'remnant', string> = {
  available: 'bg-green-100 text-green-800',
  reserved: 'bg-yellow-100 text-yellow-800',
  cut: 'bg-blue-100 text-blue-800',
  remnant: 'bg-purple-100 text-purple-800',
};

export default async function SlabsPage() {
  const client = await getApiClientWithAuth();
  const { data, error } = await client.GET('/inventory/slabs', {
    params: {
      query: {
        limit: 50,
      },
    },
  });

  if (error) return <div className="text-red-600">Failed to load slabs: {JSON.stringify(error)}</div>;
  const slabs = data?.data ?? [];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold">Slabs</h2>
        <Button asChild><Link href="/slabs/new">Add Slab</Link></Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Stone Type</TableHead>
            <TableHead>Finish</TableHead>
            <TableHead>Grade</TableHead>
            <TableHead>Size (LxW in)</TableHead>
            <TableHead>Sq Ft</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Cost</TableHead>
            <TableHead>Warehouse Location</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {slabs.map((slab) => (
            <TableRow key={slab.id}>
              <TableCell><Link href={`/slabs/${slab.id}`} className="font-medium text-primary hover:underline">{slab.stoneType}</Link></TableCell>
              <TableCell className="capitalize">{slab.finish}</TableCell>
              <TableCell>{slab.qualityGrade}</TableCell>
              <TableCell>{slab.lengthIn.toFixed(3)} x {slab.widthIn.toFixed(3)}</TableCell>
              <TableCell>{squareFeet(slab.lengthIn, slab.widthIn)}</TableCell>
              <TableCell>
                <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium capitalize ${statusClasses[slab.status]}`}>
                  {slab.status}
                </span>
              </TableCell>
              <TableCell>{dollars(slab.costCents)}</TableCell>
              <TableCell>{slab.warehouseLocation ?? 'None'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
