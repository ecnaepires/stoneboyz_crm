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

export default async function CustomerEventsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: customerId } = await params;
  const client = await getApiClientWithAuth();

  const [{ data: customer }, { data, error }] = await Promise.all([
    client.GET('/customers/{customerId}', { params: { path: { customerId } } }),
    client.GET('/customers/{customerId}/events', {
      params: { path: { customerId }, query: { limit: 50 } },
    }),
  ]);

  if (error) {
    return <div className="text-red-600">Failed to load events: {JSON.stringify(error)}</div>;
  }

  const events = data?.data ?? [];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="mb-1 text-sm text-muted-foreground">
            <Link href={`/customers/${customerId}`} className="hover:underline">
              {customer?.name ?? 'Customer'}
            </Link>{' '}
            / Events
          </div>
          <h2 className="text-2xl font-bold">Events</h2>
        </div>
        <Button asChild>
          <Link href={`/customers/${customerId}/events/new`}>+ New Event</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Customer Events</CardTitle>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground">No events yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Appointment Type</TableHead>
                  <TableHead>Scheduled At</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell>
                      <Link
                        href={`/customers/${customerId}/events/${event.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {event.title}
                      </Link>
                    </TableCell>
                    <TableCell className="capitalize">{event.eventType.replace('_', ' ')}</TableCell>
                    <TableCell className="capitalize">{event.appointmentType?.replace('_', ' ') ?? '-'}</TableCell>
                    <TableCell>{new Date(event.scheduledAt).toLocaleString()}</TableCell>
                    <TableCell>{event.durationMinutes}</TableCell>
                    <TableCell className="capitalize">{event.status.replace('_', ' ')}</TableCell>
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
