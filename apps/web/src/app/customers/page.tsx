import Link from 'next/link';
import { getApiClientWithAuth } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  const { search } = await searchParams;
  const client = await getApiClientWithAuth();
  const { data, error } = await client.GET('/customers', {
    params: { query: { limit: 50, ...(search ? { search } : {}) } },
  });

  if (error) {
    return (
      <div className="text-red-600">
        Failed to load customers: {JSON.stringify(error)}
      </div>
    );
  }

  const customers = data?.data ?? [];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold">Customers</h2>
        <Button asChild>
          <Link href="/customers/new">+ New Customer</Link>
        </Button>
      </div>

      <form method="get" className="mb-4 flex gap-2">
        <input
          type="text"
          name="search"
          defaultValue={search ?? ''}
          placeholder="Search customers..."
          className="flex h-10 w-80 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
        <button
          type="submit"
          className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Search
        </button>
        {search && (
          <a
            href="/customers"
            className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            Clear
          </a>
        )}
      </form>

      {customers.length === 0 ? (
        <p className="text-muted-foreground">No customers yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Industry</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.map((customer) => (
              <TableRow key={customer.id}>
                <TableCell>
                  <Link
                    href={`/customers/${customer.id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {customer.name}
                  </Link>
                </TableCell>
                <TableCell>
                  <span className="capitalize">{customer.status}</span>
                </TableCell>
                <TableCell>
                  <span className="capitalize">{customer.type}</span>
                </TableCell>
                <TableCell>{customer.industry ?? '-'}</TableCell>
                <TableCell>
                  {new Date(customer.createdAt).toLocaleDateString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
