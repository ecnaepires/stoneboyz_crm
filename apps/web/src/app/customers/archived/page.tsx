import Link from 'next/link';
import { getApiClientWithAuth } from '@/lib/api';
import { restoreFromArchivedListAction } from '../_actions';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';

export default async function ArchivedCustomersPage() {
  const client = await getApiClientWithAuth();
  const { data, error } = await client.GET('/customers', {
    params: { query: { limit: 50, includeArchived: true } },
  });

  if (error) {
    return <div className="text-red-600">Failed to load archived customers: {JSON.stringify(error)}</div>;
  }

  const customers = data?.data ?? [];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="mb-1 text-sm text-muted-foreground">
            <Link href="/customers" className="hover:underline">Customers</Link> / Archived
          </div>
          <h2 className="text-2xl font-bold">Archived Customers</h2>
        </div>
      </div>

      {customers.length === 0 ? (
        <p className="text-muted-foreground">No archived customers.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Status (before archive)</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Archived</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.map((customer) => {
              const restoreWithId = restoreFromArchivedListAction.bind(null, customer.id);
              return (
                <TableRow key={customer.id} className="opacity-70">
                  <TableCell className="font-medium">{customer.name}</TableCell>
                  <TableCell className="capitalize">{customer.status}</TableCell>
                  <TableCell className="capitalize">{customer.type}</TableCell>
                  <TableCell>
                    {customer.archivedAt
                      ? new Date(customer.archivedAt).toLocaleDateString()
                      : '-'}
                  </TableCell>
                  <TableCell>
                    <form action={restoreWithId}>
                      <Button type="submit" variant="outline" size="sm">Restore</Button>
                    </form>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
