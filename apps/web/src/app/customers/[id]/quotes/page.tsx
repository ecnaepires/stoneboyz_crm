import Link from 'next/link';
import { getApiClientWithAuth } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected';

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export default async function CustomerQuotesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: QuoteStatus; projectId?: string }>;
}) {
  const { id: customerId } = await params;
  const { status, projectId } = await searchParams;
  const client = await getApiClientWithAuth();

  const [{ data: customer }, { data, error }, { data: projectsRes }] = await Promise.all([
    client.GET('/customers/{customerId}', { params: { path: { customerId } } }),
    client.GET('/customers/{customerId}/quotes', {
      params: {
        path: { customerId },
        query: {
          limit: 50,
          ...(status ? { status } : {}),
          ...(projectId ? { projectId } : {}),
        },
      },
    }),
    client.GET('/projects', { params: { query: { customerId, limit: 100 } } }),
  ]);

  if (error) {
    return <div className="text-red-600">Failed to load quotes: {JSON.stringify(error)}</div>;
  }

  const quotes = data?.data ?? [];
  const projects = projectsRes?.data ?? [];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="mb-1 text-sm text-muted-foreground">
            <Link href={`/customers/${customerId}`} className="hover:underline">
              {customer?.name ?? 'Customer'}
            </Link>{' '}
            / Quotes
          </div>
          <h2 className="text-2xl font-bold">Quotes</h2>
        </div>
        <Button asChild>
          <Link href={`/customers/${customerId}/quotes/new`}>+ New Quote</Link>
        </Button>
      </div>

      <form method="get" className="mb-4 flex flex-wrap gap-2">
        <Select name="status" defaultValue={status ?? ''} className="w-44">
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="accepted">Accepted</option>
          <option value="rejected">Rejected</option>
        </Select>
        <Select
          name="projectId"
          defaultValue={projectId ?? ''}
          className="w-64"
          aria-label="Project"
        >
          <option value="">All projects</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.title}
            </option>
          ))}
          {projectId && !projects.some((project) => project.id === projectId) && (
            <option value={projectId}>Selected project</option>
          )}
        </Select>
        <button
          type="submit"
          className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Filter
        </button>
        {(status || projectId) && (
          <a
            href={`/customers/${customerId}/quotes`}
            className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            Clear
          </a>
        )}
      </form>

      {quotes.length === 0 ? (
        <p className="text-muted-foreground">No quotes yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Quote #</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Valid Until</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {quotes.map((quote) => (
              <TableRow key={quote.id}>
                <TableCell>
                  <Link
                    href={`/customers/${customerId}/quotes/${quote.id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {quote.quoteNumber}
                  </Link>
                </TableCell>
                <TableCell>{quote.title}</TableCell>
                <TableCell>
                  <span className="capitalize">{quote.status}</span>
                </TableCell>
                <TableCell>{quote.validUntil ?? '-'}</TableCell>
                <TableCell>{money(quote.totalCents)}</TableCell>
                <TableCell>{new Date(quote.createdAt).toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
