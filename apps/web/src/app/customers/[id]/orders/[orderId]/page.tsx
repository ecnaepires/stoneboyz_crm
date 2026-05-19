import Link from 'next/link';
import { notFound } from 'next/navigation';
import { archiveOrderAction, addPaymentAction, removePaymentAction } from '../_actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getApiClientWithAuth } from '@/lib/api';

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

const statusLabel = {
  unpaid: 'Unpaid',
  partially_paid: 'Partial',
  paid: 'Paid',
};

const paymentMethodLabel = {
  cash: 'Cash',
  check: 'Check',
  mastercard: 'Mastercard',
  visa: 'Visa',
  american_express: 'American Express',
  discover: 'Discover',
  bank_transfer: 'Bank Transfer',
  echeck: 'E-Check',
};

const today = () => new Date().toISOString().slice(0, 10);

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string; orderId: string }>;
}) {
  const { id: customerId, orderId } = await params;
  const client = await getApiClientWithAuth();

  const [{ data: order, error }, { data: customer }] = await Promise.all([
    client.GET('/customers/{customerId}/orders/{orderId}', {
      params: { path: { customerId, orderId } },
    }),
    client.GET('/customers/{customerId}', { params: { path: { customerId } } }),
  ]);

  if (error || !order) {
    notFound();
  }

  const addPaymentWithIds = addPaymentAction.bind(null, customerId, orderId);
  const archiveWithIds = archiveOrderAction.bind(null, customerId, orderId);

  return (
    <div className="max-w-5xl">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <div className="mb-1 text-sm text-muted-foreground">
            <Link href={`/customers/${customerId}`} className="hover:underline">
              {customer?.name ?? 'Customer'}
            </Link>{' '}
            / <Link href={`/customers/${customerId}/orders`} className="hover:underline">Orders</Link> /{' '}
            {order.orderNumber}
          </div>
          <h2 className="text-2xl font-bold">{order.title}</h2>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <span className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium">
            {statusLabel[order.paymentStatus]}
          </span>
          {!order.archivedAt && (
            <form action={archiveWithIds}>
              <Button type="submit" variant="outline" size="sm">Archive</Button>
            </form>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Order Info</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div>
                <dt className="text-muted-foreground">Order #</dt>
                <dd>{order.orderNumber}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Sale Date</dt>
                <dd>{order.saleDate}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Quote</dt>
                <dd>
                  <Link href={`/customers/${customerId}/quotes/${order.quoteId}`} className="text-primary hover:underline">
                    View quote
                  </Link>
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Updated</dt>
                <dd>{new Date(order.updatedAt).toLocaleString()}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Financials</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div>
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd>{money(order.subtotalCents)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Discount</dt>
                <dd>{money(order.discountCents)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Tax Rate</dt>
                <dd>{order.taxRateBps / 100}%</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Total</dt>
                <dd className="font-bold">{money(order.totalCents)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Total Paid</dt>
                <dd className="font-medium text-green-700">{money(order.totalPaidCents)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Balance Due</dt>
                <dd className={order.balanceDueCents > 0 ? 'font-medium text-red-700' : 'font-medium'}>
                  {money(order.balanceDueCents)}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payments</CardTitle>
          </CardHeader>
          <CardContent>
            {order.payments.length === 0 ? (
              <p className="mb-4 text-sm text-muted-foreground">No payments yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>{payment.paymentDate}</TableCell>
                      <TableCell>{paymentMethodLabel[payment.paymentMethod]}</TableCell>
                      <TableCell>{money(payment.amountCents)}</TableCell>
                      <TableCell>{payment.referenceNumber ?? '-'}</TableCell>
                      <TableCell className="text-right">
                        <form action={removePaymentAction.bind(null, customerId, orderId, payment.id)}>
                          <Button type="submit" variant="ghost" size="sm">Remove</Button>
                        </form>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            <form action={addPaymentWithIds} className="mt-4 rounded-md border p-3">
              <div className="grid grid-cols-4 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="paymentDate">Date *</Label>
                  <Input id="paymentDate" name="paymentDate" type="date" defaultValue={today()} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount *</Label>
                  <Input id="amount" name="amount" type="number" step="0.01" min="0.01" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paymentMethod">Method *</Label>
                  <Select id="paymentMethod" name="paymentMethod" defaultValue="cash" required>
                    <option value="cash">Cash</option>
                    <option value="check">Check</option>
                    <option value="mastercard">Mastercard</option>
                    <option value="visa">Visa</option>
                    <option value="american_express">American Express</option>
                    <option value="discover">Discover</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="echeck">E-Check</option>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="referenceNumber">Reference</Label>
                  <Input id="referenceNumber" name="referenceNumber" />
                </div>
                <div className="col-span-4 space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Input id="notes" name="notes" />
                </div>
              </div>
              <Button type="submit" className="mt-3">Add Payment</Button>
            </form>
          </CardContent>
        </Card>

        {order.notes && (
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm">{order.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
