import type { components } from '@stoneboyz/api-client';
import Link from 'next/link';
import { getApiClientWithAuth } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD'
});

type RecentQuote = components['schemas']['RecentQuote'];

const formatCurrencyFromCents = (cents: number): string => currencyFormatter.format(cents / 100);

const capitalize = (value: string): string => value.charAt(0).toUpperCase() + value.slice(1);

const getStatusClass = (status: RecentQuote['status']): string => {
  switch (status) {
    case 'draft':
      return 'text-gray-500';
    case 'sent':
      return 'text-blue-600';
    case 'accepted':
      return 'text-green-600';
    case 'rejected':
      return 'text-red-500';
    case 'archived':
      return 'text-gray-400';
    default:
      return 'text-foreground';
  }
};

export default async function DashboardPage() {
  const client = await getApiClientWithAuth();
  const { data, error } = await client.GET('/dashboard', {});

  if (error) {
    return <div className="text-red-600">Failed to load dashboard: {JSON.stringify(error)}</div>;
  }

  if (!data) {
    return <div className="text-muted-foreground">No dashboard data available.</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Dashboard</h2>
        <p className="text-sm text-muted-foreground">Snapshot of customers, quotes, orders, and upcoming events.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Active Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data.activeCustomers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Open Quotes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-3xl font-bold">{data.openQuotes.count}</div>
            <div className="text-sm text-muted-foreground">{formatCurrencyFromCents(data.openQuotes.totalCents)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Orders This Month</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-3xl font-bold">{data.ordersThisMonth.count}</div>
            <div className="text-sm text-muted-foreground">{formatCurrencyFromCents(data.ordersThisMonth.totalCents)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Events This Week</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data.eventsThisWeek}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Quotes</CardTitle>
        </CardHeader>
        <CardContent>
          {data.recentQuotes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent quotes yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quote#</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recentQuotes.map((quote: RecentQuote) => (
                  <TableRow key={quote.id}>
                    <TableCell>
                      <Link
                        href={`/customers/${quote.customerId}/quotes/${quote.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {quote.quoteNumber}
                      </Link>
                    </TableCell>
                    <TableCell>{quote.title}</TableCell>
                    <TableCell>
                      <Link href={`/customers/${quote.customerId}`} className="text-primary hover:underline">
                        {quote.customerName}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <span className={`capitalize ${getStatusClass(quote.status)}`}>
                        {capitalize(quote.status)}
                      </span>
                    </TableCell>
                    <TableCell>{new Date(quote.createdAt).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
