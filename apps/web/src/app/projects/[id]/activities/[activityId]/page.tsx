import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, CalendarDays, ClipboardList, StickyNote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AssigneeSelect } from '@/components/assignee-select';
import { getApiClientWithAuth } from '@/lib/api';
import { rescheduleJobActivityAction, scheduleJobActivityAction } from '../../_actions';
import {
  addActivityEditorNoteAction,
  cancelActivityAction,
  confirmActivityAction,
  deleteActivityEditorNoteAction,
  finishActivityAction,
  startActivityAction,
} from './_actions';

interface ActivityPageProps {
  params: Promise<{ id: string; activityId: string }>;
}

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

const labelize = (value: string | null | undefined) =>
  value ? value.replace(/_/g, ' ') : '-';

const dateInputValue = (value: string | null | undefined) =>
  value ? new Date(value).toISOString().slice(0, 10) : undefined;

const timeInputValue = (value: string | null | undefined) =>
  value ? new Date(value).toISOString().slice(11, 16) : '08:00';

const formatDateTime = (value: string | null | undefined) =>
  value ? new Date(value).toLocaleString() : '-';

const statusClass = (status: string) => {
  switch (status) {
    case 'completed':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    case 'confirmed':
    case 'scheduled':
      return 'border-blue-200 bg-blue-50 text-blue-700';
    case 'in_progress':
      return 'border-amber-200 bg-amber-50 text-amber-700';
    case 'cancelled':
      return 'border-red-200 bg-red-50 text-red-700';
    default:
      return 'border-slate-200 bg-slate-50 text-slate-700';
  }
};

export default async function JobActivityPage({ params }: ActivityPageProps) {
  const { id: projectId, activityId } = await params;
  const client = await getApiClientWithAuth();

  const { data: project, error: projectError } = await client.GET('/projects/{projectId}', {
    params: { path: { projectId } },
  });

  if (projectError || !project) {
    notFound();
  }

  const [{ data: customer }, { data: activities }, { data: usersRes }, { data: assigneesRes }] = await Promise.all([
    client.GET('/customers/{customerId}', {
      params: { path: { customerId: project.customerId } },
    }),
    client.GET('/customers/{customerId}/projects/{projectId}/activities', {
      params: { path: { customerId: project.customerId, projectId } },
    }),
    client.GET('/users', {}),
    client.GET('/assignees', {}),
  ]);

  const activity = activities?.find((item) => item.id === activityId);

  if (!activity) {
    notFound();
  }

  const { data: event } = activity.scheduledEventId
    ? await client.GET('/customers/{customerId}/events/{eventId}', {
        params: { path: { customerId: project.customerId, eventId: activity.scheduledEventId } },
      })
    : { data: null };

  const { data: notesRes } = event
    ? await (client as unknown as NotesQueryClient).GET('/customers/{customerId}/events/{eventId}/notes', {
        params: { path: { customerId: project.customerId, eventId: event.id } },
      })
    : { data: [] };

  const users = usersRes ?? [];
  const assignees = assigneesRes ?? [];
  const notes = notesRes ?? [];
  const authorById = new Map<string, string>(users.map((user) => [user.id, user.name]));
  const canSchedule = activity.status === 'not_scheduled';
  const canReschedule = activity.status === 'scheduled' || activity.status === 'confirmed';

  return (
    <div className="max-w-4xl space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-1 text-sm text-muted-foreground">
            <Link href={`/projects/${projectId}`} className="inline-flex items-center gap-1 hover:underline">
              <ArrowLeft className="h-3.5 w-3.5" />
              {project.title}
            </Link>
          </div>
          <h2 className="text-2xl font-bold">{activity.title}</h2>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>{customer?.name ?? 'Account'}</span>
            <span>/</span>
            <span>{labelize(activity.appointmentType ?? activity.activityType)}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium capitalize ${statusClass(activity.status)}`}>
            {labelize(activity.status)}
          </span>
          {event?.status === 'scheduled' ? (
            <>
              <form action={confirmActivityAction.bind(null, project.customerId, projectId, activity.id, event.id)}>
                <Button type="submit" size="sm">Confirm</Button>
              </form>
              <form action={cancelActivityAction.bind(null, project.customerId, projectId, activity.id, event.id)}>
                <Button type="submit" variant="outline" size="sm">Cancel</Button>
              </form>
            </>
          ) : null}
          {event?.status === 'confirmed' ? (
            <>
              <form action={startActivityAction.bind(null, project.customerId, projectId, activity.id, event.id)}>
                <Button type="submit" size="sm">Start</Button>
              </form>
              <form action={cancelActivityAction.bind(null, project.customerId, projectId, activity.id, event.id)}>
                <Button type="submit" variant="outline" size="sm">Cancel</Button>
              </form>
            </>
          ) : null}
          {event?.status === 'in_progress' ? (
            <form action={finishActivityAction.bind(null, project.customerId, projectId, activity.id, event.id)}>
              <Button type="submit" size="sm">Finish</Button>
            </form>
          ) : null}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          {canSchedule || canReschedule ? (
            <form
              action={(canSchedule ? scheduleJobActivityAction : rescheduleJobActivityAction).bind(null, project.customerId, projectId, activity.id)}
              className="grid gap-4 md:grid-cols-[1fr_9rem_7rem_1fr_auto]"
            >
              <div className="space-y-2">
                <Label htmlFor="scheduledDate">Date</Label>
                <Input id="scheduledDate" name="scheduledDate" type="date" required defaultValue={dateInputValue(event?.scheduledAt)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="startTime">Time</Label>
                <Input id="startTime" name="startTime" type="time" defaultValue={timeInputValue(event?.scheduledAt)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="durationMinutes">Minutes</Label>
                <Input id="durationMinutes" name="durationMinutes" type="number" min={1} defaultValue={activity.durationMinutes} />
              </div>
              <AssigneeSelect assignees={assignees} defaultSelectedIds={event?.assigneeIds} />
              <div className="flex items-end">
                <Button type="submit">{canSchedule ? 'Schedule' : 'Update'}</Button>
              </div>
            </form>
          ) : (
            <div className="grid gap-3 text-sm md:grid-cols-2">
              <div>
                <div className="text-muted-foreground">Scheduled At</div>
                <div>{formatDateTime(event?.scheduledAt)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Duration</div>
                <div>{activity.durationMinutes} minutes</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
            Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-3 text-sm md:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Activity Type</dt>
              <dd className="capitalize">{labelize(activity.activityType)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Appointment Type</dt>
              <dd className="capitalize">{labelize(activity.appointmentType)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Template Kind</dt>
              <dd className="capitalize">{labelize(activity.templateKind)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Sort Order</dt>
              <dd>{activity.sortOrder}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Calendar Event</dt>
              <dd>
                {event ? (
                  <Link href={`/customers/${project.customerId}/events/${event.id}`} className="text-primary hover:underline">
                    View calendar event
                  </Link>
                ) : (
                  '-'
                )}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Updated</dt>
              <dd>{formatDateTime(activity.updatedAt)}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <StickyNote className="h-4 w-4 text-muted-foreground" />
            Notes ({notes.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {event ? (
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
                        <form action={deleteActivityEditorNoteAction.bind(null, project.customerId, projectId, activity.id, event.id, note.id)}>
                          <Button type="submit" variant="ghost" size="sm">Delete</Button>
                        </form>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <form action={addActivityEditorNoteAction.bind(null, project.customerId, projectId, activity.id, event.id)} className="space-y-3">
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
          ) : (
            <p className="text-sm text-muted-foreground">Schedule this activity before adding activity notes.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
