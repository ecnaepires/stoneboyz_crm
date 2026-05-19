import Link from 'next/link';
import { getApiClientWithAuth } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

const statusLabel = {
  unpaid: 'Unpaid',
  partially_paid: 'Partial',
  paid: 'Paid',
};

export default async function CustomerOrdersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: customerId } = await params;
  const client = await getApiClientWithAuth();

  const [{ data: customer }, { data, error }] = await Promise.all([
    client.GET('/customers/{customerId}', { params: { path: { customerId } } }),
    client.GET('/customers/{customerId}/orders', {
      params: { path: { customerId }, query: { limit: 50 } },
    }),
  ]);

  if (error) {
    return <div className="text-red-600">Failed to load orders: {JSON.stringify(error)}</div>;
  }

  const orders = data?.data ?? [];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="mb-1 text-sm text-muted-foreground">
            <Link href={`/customers/${customerId}`} className="hover:underline">
              {customer?.name ?? 'Customer'}
            </Link>{' '}
            / Orders
          </div>
          <h2 className="text-2xl font-bold">Orders</h2>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Customer Orders</CardTitle>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No orders yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Sale Date</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.orderNumber}</TableCell>
                    <TableCell>{order.title}</TableCell>
                    <TableCell>{order.saleDate}</TableCell>
                    <TableCell>{money(order.totalCents)}</TableCell>
                    <TableCell>{money(order.totalPaidCents)}</TableCell>
                    <TableCell>{money(order.balanceDueCents)}</TableCell>
                    <TableCell>{statusLabel[order.paymentStatus]}</TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/customers/${customerId}/orders/${order.id}`}>View</Link>
                      </Button>
                    </TableCell>
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
