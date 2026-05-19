import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getApiClientWithAuth } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  archiveEventAction,
  cancelEventAction,
  completeEventAction,
  confirmEventAction,
  startEventAction,
} from '../_actions';

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string; eventId: string }>;
}) {
  const { id: customerId, eventId } = await params;
  const client = await getApiClientWithAuth();

  const [{ data: event, error }, { data: customer }] = await Promise.all([
    client.GET('/customers/{customerId}/events/{eventId}', {
      params: { path: { customerId, eventId } },
    }),
    client.GET('/customers/{customerId}', { params: { path: { customerId } } }),
  ]);

  if (error || !event) {
    notFound();
  }

  const canEdit = event.status === 'scheduled' || event.status === 'confirmed';
  const { data: project } = event.projectId
    ? await client.GET('/projects/{projectId}', {
        params: { path: { projectId: event.projectId } },
      })
    : { data: null };

  const confirmWithIds = confirmEventAction.bind(null, customerId, eventId);
  const startWithIds = startEventAction.bind(null, customerId, eventId);
  const completeWithIds = completeEventAction.bind(null, customerId, eventId);
  const cancelWithIds = cancelEventAction.bind(null, customerId, eventId);
  const archiveWithIds = archiveEventAction.bind(null, customerId, eventId);

  return (
    <div className="max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="mb-1 text-sm text-muted-foreground">
            <Link href={`/customers/${customerId}`} className="hover:underline">
              {customer?.name ?? 'Customer'}
            </Link>{' '}
            / <Link href={`/customers/${customerId}/events`} className="hover:underline">Events</Link> /{' '}
            {event.title}
          </div>
          <h2 className="text-2xl font-bold">{event.title}</h2>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <span className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium capitalize">
            {event.status.replace('_', ' ')}
          </span>
          {canEdit && (
            <Button asChild variant="outline" size="sm">
              <Link href={`/customers/${customerId}/events/${eventId}/edit`}>Edit</Link>
            </Button>
          )}
          {event.status === 'scheduled' && (
            <>
              <form action={confirmWithIds}>
                <Button type="submit" size="sm">Confirm</Button>
              </form>
              <form action={cancelWithIds}>
                <Button type="submit" variant="outline" size="sm">Cancel</Button>
              </form>
            </>
          )}
          {event.status === 'confirmed' && (
            <>
              <form action={startWithIds}>
                <Button type="submit" size="sm">Start</Button>
              </form>
              <form action={cancelWithIds}>
                <Button type="submit" variant="outline" size="sm">Cancel</Button>
              </form>
            </>
          )}
          {event.status === 'in_progress' && (
            <form action={completeWithIds}>
              <Button type="submit" size="sm">Complete</Button>
            </form>
          )}
          {(event.status === 'completed' || event.status === 'cancelled') && (
            <form action={archiveWithIds}>
              <Button type="submit" variant="outline" size="sm">Archive</Button>
            </form>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Info</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div>
                <dt className="text-muted-foreground">ID</dt>
                <dd>{event.id}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Customer ID</dt>
                <dd>{event.customerId}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Title</dt>
                <dd>{event.title}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Status</dt>
                <dd className="capitalize">{event.status.replace('_', ' ')}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Event Type</dt>
                <dd className="capitalize">{event.eventType.replace('_', ' ')}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Appointment Type</dt>
                <dd className="capitalize">{event.appointmentType?.replace('_', ' ') ?? '-'}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Scheduled At</dt>
                <dd>{new Date(event.scheduledAt).toLocaleString()}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Duration</dt>
                <dd>{event.durationMinutes} minutes</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-muted-foreground">Assignees</dt>
                <dd>{event.assigneeUserIds.join(', ') || '-'}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Project</dt>
                <dd>
                  {event.projectId ? (
                    <Link href={`/projects/${event.projectId}`} className="text-primary hover:underline">
                      {project?.title ?? 'View project'}
                    </Link>
                  ) : (
                    '-'
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Updated</dt>
                <dd>{new Date(event.updatedAt).toLocaleString()}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Created</dt>
                <dd>{new Date(event.createdAt).toLocaleString()}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Archived At</dt>
                <dd>{event.archivedAt ? new Date(event.archivedAt).toLocaleString() : '-'}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Archived By User ID</dt>
                <dd>{event.archivedByUserId ?? '-'}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-muted-foreground">Address</dt>
                <dd className="whitespace-pre-wrap">{event.address ?? '-'}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-muted-foreground">Notes</dt>
                <dd className="whitespace-pre-wrap">{event.notes ?? '-'}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
