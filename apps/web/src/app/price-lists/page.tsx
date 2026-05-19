import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getApiClientWithAuth } from '@/lib/api';

export default async function PriceListsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: 'draft' | 'active' | 'archived'; includeArchived?: string }>;
}) {
  const { search, status, includeArchived } = await searchParams;
  const client = await getApiClientWithAuth();
  const { data, error } = await client.GET('/price-lists', {
    params: {
      query: {
        limit: 50,
        ...(search ? { search } : {}),
        ...(status ? { status } : {}),
        includeArchived: includeArchived === 'true',
      },
    },
  });

  if (error) return <div className="text-red-600">Failed to load price lists: {JSON.stringify(error)}</div>;
  const priceLists = data?.data ?? [];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold">Price Lists</h2>
        <Button asChild><Link href="/price-lists/new">+ New Price List</Link></Button>
      </div>
      <form method="get" className="mb-4 flex flex-wrap gap-2">
        <input name="search" defaultValue={search ?? ''} placeholder="Search price lists..." className="flex h-10 w-80 rounded-md border border-input bg-background px-3 py-2 text-sm" />
        <Select name="status" defaultValue={status ?? ''} className="w-44">
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="archived">Archived</option>
        </Select>
        <label className="inline-flex h-10 items-center gap-2 text-sm">
          <input type="checkbox" name="includeArchived" value="true" defaultChecked={includeArchived === 'true'} />
          Archived only
        </label>
        <button type="submit" className="inline-flex h-10 items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Filter</button>
      </form>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Revision</TableHead>
            <TableHead>Tax</TableHead>
            <TableHead>Updated</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {priceLists.map((priceList) => (
            <TableRow key={priceList.id}>
              <TableCell><Link href={`/price-lists/${priceList.id}`} className="font-medium text-primary hover:underline">{priceList.name}</Link></TableCell>
              <TableCell className="capitalize">{priceList.status}</TableCell>
              <TableCell>{priceList.revision}</TableCell>
              <TableCell>{(priceList.defaultTaxRateBps / 100).toFixed(2)}%</TableCell>
              <TableCell>{new Date(priceList.updatedAt).toLocaleDateString()}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
