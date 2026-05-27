import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getApiClientWithAuth } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  archiveEventAction,
  cancelEventAction,
  confirmEventAction,
  finishEventAction,
  startEventAction,
} from '../_actions';
import { addActivityNoteAction, deleteActivityNoteAction } from './_actions';

interface ActivityNote {
  id: string;
  authorUserId: string;
  body: string;
  createdAt: string;
}

type NotesQueryClient = {
  GET: (
    path: '/customers/{customerId}/events/{eventId}/notes',
    options: { params: { path: { customerId: string; eventId: string } } }
  ) => Promise<{ data?: ActivityNote[]; error?: unknown }>;
};

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string; eventId: string }>;
}) {
  const { id: customerId, eventId } = await params;
  const client = await getApiClientWithAuth();

  const [{ data: event, error }, { data: customer }, { data: notesRes }, { data: usersRes }] = await Promise.all([
    client.GET('/customers/{customerId}/events/{eventId}', {
      params: { path: { customerId, eventId } },
    }),
    client.GET('/customers/{customerId}', { params: { path: { customerId } } }),
    (client as unknown as NotesQueryClient).GET('/customers/{customerId}/events/{eventId}/notes', {
      params: { path: { customerId, eventId } },
    }),
    client.GET('/users', {}),
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
  const finishWithIds = finishEventAction.bind(null, customerId, eventId);
  const cancelWithIds = cancelEventAction.bind(null, customerId, eventId);
  const archiveWithIds = archiveEventAction.bind(null, customerId, eventId);
  const addNoteWithIds = addActivityNoteAction.bind(null, customerId, eventId);
  const notes = notesRes ?? [];
  const authorById = new Map<string, string>((usersRes ?? []).map((user) => [user.id, user.name]));

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
            <form action={finishWithIds}>
              <Button type="submit" size="sm">Finish</Button>
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

        <Card>
          <CardHeader>
            <CardTitle>Activity Notes ({notes.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {notes.length === 0 ? (
                <p className="text-sm text-muted-foreground">No notes.</p>
              ) : (
                <ul className="space-y-3">
                  {notes.map((note) => (
                    <li key={note.id} className="rounded-md border p-3 text-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="whitespace-pre-wrap">{note.body}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {(authorById.get(note.authorUserId) ?? note.authorUserId)} - {new Date(note.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <form action={deleteActivityNoteAction.bind(null, customerId, eventId, note.id)}>
                          <Button type="submit" variant="ghost" size="sm">Delete</Button>
                        </form>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <form action={addNoteWithIds} className="space-y-3">
                <textarea
                  name="body"
                  rows={3}
                  placeholder="Add a note..."
                  required
                  className="flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
                <Button type="submit">Add Note</Button>
              </form>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
