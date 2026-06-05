import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  AlertCircle,
  CalendarDays,
  CheckSquare,
  ClipboardList,
  FileText,
  Folder,
  MapPin,
  PackageOpen,
  Pencil,
  Plus,
  Receipt,
  Users,
} from 'lucide-react';
import { archiveProjectAction } from '../_actions';
import { addJobNoteAction, deleteJobNoteAction, updateChecklistAction, type ChecklistField } from './_actions';
import { ChecklistToggle } from './checklist-toggle';
import { JobSlabsPanel } from './JobSlabsPanel';
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

interface ProjectDetailPageProps {
  params: Promise<{ id: string }>;
}

interface JobNote {
  id: string;
  authorUserId: string;
  body: string;
  createdAt: string;
}

interface Phase {
  id: string;
  name: string;
  phaseNumber: number;
}

interface JobChecklist {
  id: string;
  customerId: string;
  projectId: string;
  phaseId: string;
  depositReceived: boolean;
  tearoutRequired: boolean;
  tearoutCompleted: boolean;
  readyToTemplate: boolean;
  approvedForInstall: boolean;
  createdAt: string;
  updatedAt: string;
}

type NotesQueryClient = {
  GET: (
    path: '/customers/{customerId}/projects/{projectId}/notes',
    options: { params: { path: { customerId: string; projectId: string } } }
  ) => Promise<{ data?: JobNote[]; error?: unknown }>;
};

type ProjectDetailQueryClient = {
  GET: {
    (
      path: '/customers/{customerId}/projects/{projectId}/phases',
      options: { params: { path: { customerId: string; projectId: string } } }
    ): Promise<{ data?: Phase[]; error?: unknown }>;
    (
      path: '/customers/{customerId}/projects/{projectId}/phases/{phaseId}/checklist',
      options: { params: { path: { customerId: string; projectId: string; phaseId: string } } }
    ): Promise<{ data?: JobChecklist; error?: unknown }>;
  };
};

const checklistRows: Array<{ field: ChecklistField; label: string }> = [
  { field: 'depositReceived', label: 'Deposit Received' },
  { field: 'tearoutRequired', label: 'Tearout Required' },
  { field: 'tearoutCompleted', label: 'Tearout Completed' },
  { field: 'readyToTemplate', label: 'Ready to Template' },
  { field: 'approvedForInstall', label: 'Approved for Install' },
];

const activityNames = [
  'Template',
  'Deposit',
  'Material',
  'Fabrication',
  'Install',
  'Invoice',
  'Repair',
] as const;

const money = (cents: number | null | undefined) =>
  `$${((cents ?? 0) / 100).toFixed(2)}`;

const formatDate = (value: string | null | undefined) =>
  value ? new Date(value).toLocaleDateString() : 'No date';

const formatDateTime = (value: string | null | undefined) =>
  value ? new Date(value).toLocaleString() : '-';

const labelize = (value: string | null | undefined) =>
  value ? value.replace(/_/g, ' ') : '-';

const assigneeLabel = (assigneeUserIds: string[] | undefined) => {
  if (!assigneeUserIds?.length) {
    return '-';
  }

  return assigneeUserIds.length === 1 ? '1 user' : `${assigneeUserIds.length} users`;
};

const statusClass = (status: string) => {
  switch (status) {
    case 'completed':
    case 'paid':
    case 'accepted':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    case 'confirmed':
    case 'sent':
    case 'partially_paid':
      return 'border-blue-200 bg-blue-50 text-blue-700';
    case 'in_progress':
    case 'active':
      return 'border-amber-200 bg-amber-50 text-amber-700';
    case 'cancelled':
    case 'rejected':
    case 'unpaid':
      return 'border-red-200 bg-red-50 text-red-700';
    default:
      return 'border-slate-200 bg-slate-50 text-slate-700';
  }
};

const SectionTitle = ({
  icon: Icon,
  title,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  action?: React.ReactNode;
}) => (
  <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <h3 className="text-sm font-semibold">{title}</h3>
    </div>
    {action}
  </div>
);

export default async function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const { id } = await params;
  const client = await getApiClientWithAuth();

  const { data: project, error } = await client.GET('/projects/{projectId}', {
    params: { path: { projectId: id } },
  });

  if (error || !project) {
    notFound();
  }

  const [
    { data: customer },
    { data: contactsRes },
    { data: addressesRes },
    { data: quotesRes },
    { data: ordersRes },
    { data: eventsRes },
    { data: notesRes },
    { data: usersRes },
    { data: phasesRes },
  ] = await Promise.all([
    client.GET('/customers/{customerId}', {
      params: { path: { customerId: project.customerId } },
    }),
    client.GET('/customers/{customerId}/contacts', {
      params: { path: { customerId: project.customerId } },
    }),
    client.GET('/customers/{customerId}/addresses', {
      params: { path: { customerId: project.customerId } },
    }),
    client.GET('/customers/{customerId}/quotes', {
      params: {
        path: { customerId: project.customerId },
        query: { projectId: id, limit: 50 },
      },
    }),
    client.GET('/customers/{customerId}/orders', {
      params: { path: { customerId: project.customerId }, query: { limit: 50 } },
    }),
    client.GET('/customers/{customerId}/events', {
      params: {
        path: { customerId: project.customerId },
        query: { projectId: id, limit: 50 },
      },
    }),
    (client as unknown as NotesQueryClient).GET('/customers/{customerId}/projects/{projectId}/notes', {
      params: { path: { customerId: project.customerId, projectId: id } },
    }),
    client.GET('/users', {}),
    (client as unknown as ProjectDetailQueryClient).GET('/customers/{customerId}/projects/{projectId}/phases', {
      params: { path: { customerId: project.customerId, projectId: id } },
    }),
  ]);

  const contacts = contactsRes?.data ?? [];
  const addresses = addressesRes?.data ?? [];
  const quotes = quotesRes?.data ?? [];
  const quoteIds = new Set(quotes.map((quote) => quote.id));
  const orders = (ordersRes?.data ?? []).filter((order) => quoteIds.has(order.quoteId));
  const events = eventsRes?.data ?? [];
  const notes = notesRes ?? [];
  const phases = phasesRes ?? [];
  const activePhase = phases[0];
  const checklist = activePhase
    ? (
        await (client as unknown as ProjectDetailQueryClient).GET(
          '/customers/{customerId}/projects/{projectId}/phases/{phaseId}/checklist',
          {
            params: { path: { customerId: project.customerId, projectId: id, phaseId: activePhase.id } },
          }
        )
      ).data
    : undefined;
  const authorById = new Map<string, string>((usersRes ?? []).map((user) => [user.id, user.name]));
  const primaryContact = contacts.find((contact) => contact.isPrimary) ?? contacts[0];
  const primaryAddress = addresses.find((address) => address.isPrimary) ?? addresses[0];
  const firstQuote = quotes[0];
  const nextEvent = events
    .filter((event) => new Date(event.scheduledAt).getTime() >= Date.now())
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())[0];
  const openIssues = 0;
  const archiveWithId = archiveProjectAction.bind(null, id);
  const addNoteWithIds = addJobNoteAction.bind(null, project.customerId, id);

  const eventByActivity = new Map(
    events.map((event) => [event.appointmentType ?? event.title.toLowerCase(), event])
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-1 text-sm text-muted-foreground">
            <Link href="/customers" className="hover:underline">Customers</Link>
            {' / '}
            <Link href={`/customers/${project.customerId}`} className="hover:underline">{customer?.name ?? 'Account'}</Link>
            {' / '}
            {project.title}
          </div>
          <h2 className="text-2xl font-bold">{project.title}</h2>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>Created {formatDate(project.createdAt)}</span>
            <span>Updated {formatDate(project.updatedAt)}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium capitalize ${statusClass(project.status)}`}>
            {project.status}
          </span>
          <Button asChild variant="outline" size="sm">
            <Link href={`/projects/${id}/edit`}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit Job
            </Link>
          </Button>
          <form action={archiveWithId}>
            <Button type="submit" variant="outline" size="sm">Archive</Button>
          </form>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-md border p-3">
          <div className="text-xs text-muted-foreground">Payment status</div>
          <div className="mt-1 text-lg font-semibold capitalize">
            {orders[0]?.paymentStatus ? labelize(orders[0].paymentStatus) : 'No order'}
          </div>
        </div>
        <div className="rounded-md border p-3">
          <div className="text-xs text-muted-foreground">Next activity</div>
          <div className="mt-1 text-lg font-semibold">{nextEvent?.title ?? 'Unscheduled'}</div>
        </div>
        <div className="rounded-md border p-3">
          <div className="text-xs text-muted-foreground">Quotes</div>
          <div className="mt-1 text-lg font-semibold">{quotes.length}</div>
        </div>
        <div className="rounded-md border p-3">
          <div className="text-xs text-muted-foreground">Job issues</div>
          <div className="mt-1 text-lg font-semibold">{openIssues}</div>
        </div>
      </div>

      <div className="grid gap-5 grid-cols-[1fr_1fr]">
        <Card>
          <SectionTitle icon={Folder} title="Job Info" />
          <CardContent className="p-4">
            <dl className="grid gap-3 text-sm">
              <div>
                <dt className="text-muted-foreground">Job Name</dt>
                <dd>{project.title}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Account</dt>
                <dd>
                  <Link href={`/customers/${project.customerId}`} className="text-primary hover:underline">
                    {customer?.name ?? 'View account'}
                  </Link>
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Creation Date</dt>
                <dd>{formatDate(project.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Salesperson</dt>
                <dd className="break-words">{project.ownerUserId}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Job#</dt>
                <dd>{project.id.slice(0, 8).toUpperCase()}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Notes</dt>
                <dd className="whitespace-pre-wrap">{project.description ?? '-'}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card>
            <SectionTitle icon={MapPin} title="Job Address" />
            <CardContent className="p-4 text-sm">
              {primaryAddress ? (
                <address className="not-italic">
                  <div className="font-medium capitalize">{primaryAddress.type}</div>
                  <div>{primaryAddress.line1}{primaryAddress.line2 ? `, ${primaryAddress.line2}` : ''}</div>
                  <div>{primaryAddress.city}{primaryAddress.region ? `, ${primaryAddress.region}` : ''} {primaryAddress.postalCode ?? ''}</div>
                  <div>{primaryAddress.country}</div>
                </address>
              ) : (
                <p className="text-muted-foreground">No job address recorded.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <SectionTitle icon={Users} title={`Account Contacts (${contacts.length})`} />
            <CardContent className="p-4">
              {contacts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No contacts.</p>
              ) : (
                <div className="space-y-3">
                  {contacts.slice(0, 4).map((contact) => (
                    <div key={contact.id} className="rounded-md border p-3 text-sm">
                      <div className="font-medium">
                        {contact.firstName}{contact.lastName ? ` ${contact.lastName}` : ''}
                      </div>
                      {contact.jobTitle ? <div className="text-muted-foreground">{contact.jobTitle}</div> : null}
                      {contact.email ? <div>{contact.email}</div> : null}
                      {contact.phone ? <div>{contact.phone}</div> : null}
                    </div>
                  ))}
                </div>
              )}
              {primaryContact ? (
                <div className="mt-3 text-xs text-muted-foreground">
                  Primary: {primaryContact.firstName}{primaryContact.lastName ? ` ${primaryContact.lastName}` : ''}
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <SectionTitle
          icon={CalendarDays}
          title="Job Activities"
          action={
            <Button asChild variant="outline" size="sm">
              <Link href={`/customers/${project.customerId}/events/new`}>
                <Plus className="mr-2 h-4 w-4" />
                New Event
              </Link>
            </Button>
          }
        />
        <CardContent className="p-0">
          <Table className="table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[18%]">Activity</TableHead>
                <TableHead className="w-[16%]">Status</TableHead>
                <TableHead className="w-[16%]">Start Date</TableHead>
                <TableHead className="w-[14%]">Duration</TableHead>
                <TableHead className="w-[14%]">Assigned To</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activityNames.map((activity) => {
                const event = eventByActivity.get(activity.toLowerCase());

                return (
                  <TableRow key={activity}>
                    <TableCell className="font-medium">{activity}</TableCell>
                    <TableCell>
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${statusClass(event?.status ?? 'draft')}`}>
                        {event ? labelize(event.status) : 'Tentative'}
                      </span>
                    </TableCell>
                    <TableCell>{formatDate(event?.scheduledAt)}</TableCell>
                    <TableCell>{event ? `${event.durationMinutes} min` : '-'}</TableCell>
                    <TableCell>{assigneeLabel(event?.assigneeUserIds)}</TableCell>
                    <TableCell className="break-words text-muted-foreground">{event?.notes ?? '-'}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <SectionTitle icon={CheckSquare} title="Forms" />
        <CardContent className="grid gap-4 p-4 md:grid-cols-2">
          <div className="rounded-md border p-3">
            <div className="mb-3 flex items-center gap-2 font-medium">
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
              Job Checklist
            </div>
            {activePhase && checklist ? (
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground">
                  Phase {activePhase.phaseNumber}: {activePhase.name}
                </div>
                {checklistRows
                  .filter((row) => row.field !== 'tearoutCompleted' || checklist.tearoutRequired)
                  .map((row) => (
                    <ChecklistToggle
                      key={row.field}
                      label={row.label}
                      checked={checklist[row.field]}
                      action={updateChecklistAction.bind(
                        null,
                        project.customerId,
                        id,
                        activePhase.id,
                        row.field
                      )}
                    />
                  ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No active phase checklist available.</p>
            )}
          </div>
          <div className="rounded-md border p-3">
            <div className="mb-3 flex items-center gap-2 font-medium">
              <PackageOpen className="h-4 w-4 text-muted-foreground" />
              Order Area Details
            </div>
            {quotes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No quote or order area selected.</p>
            ) : (
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-muted-foreground">Order Area Name</dt>
                  <dd>{quotes[0]?.title}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Material</dt>
                  <dd>See quote line items</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Total Order</dt>
                  <dd>{money(quotes[0]?.totalCents)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Notes</dt>
                  <dd>{quotes[0]?.notes ?? '-'}</dd>
                </div>
              </dl>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <SectionTitle
          icon={Receipt}
          title={`Orders (${orders.length})`}
          action={
            firstQuote ? (
              <Button asChild variant="outline" size="sm">
                <Link href={`/customers/${project.customerId}/quotes/${firstQuote.id}`}>View Quote</Link>
              </Button>
            ) : null
          }
        />
        <CardContent className="p-4">
          {orders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No orders for this job yet.</p>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => (
                <div key={order.id} className="rounded-md border p-3 text-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <Link
                        href={`/customers/${project.customerId}/orders/${order.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {order.orderNumber} - {order.title}
                      </Link>
                      <div className="mt-1 text-muted-foreground">Sale Date: {formatDate(order.saleDate)}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{money(order.totalCents)}</div>
                      <span className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${statusClass(order.paymentStatus)}`}>
                        {labelize(order.paymentStatus)}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2 text-muted-foreground md:grid-cols-3">
                    <span>Paid: {money(order.totalPaidCents)}</span>
                    <span>Balance: {money(order.balanceDueCents)}</span>
                    <span>Subtotal: {money(order.subtotalCents)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <SectionTitle
          icon={FileText}
          title={`Quotes (${quotes.length})`}
          action={
            <Button asChild variant="outline" size="sm">
              <Link href={`/customers/${project.customerId}/quotes/new`}>
                <Plus className="mr-2 h-4 w-4" />
                New Quote
              </Link>
            </Button>
          }
        />
        <CardContent className="p-4">
          {quotes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No quotes attached to this job yet.</p>
          ) : (
            <div className="space-y-3">
              {quotes.map((quote) => (
                <div key={quote.id} className="flex flex-wrap items-start justify-between gap-3 rounded-md border p-3 text-sm">
                  <div>
                    <Link
                      href={`/customers/${project.customerId}/quotes/${quote.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {quote.quoteNumber} - {quote.title}
                    </Link>
                    <div className="mt-1 text-muted-foreground">Updated {formatDate(quote.updatedAt)}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{money(quote.totalCents)}</div>
                    <span className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${statusClass(quote.status)}`}>
                      {quote.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <SectionTitle icon={FileText} title="Files" />
        <CardContent className="p-4 text-sm text-muted-foreground">No files uploaded yet.</CardContent>
      </Card>

      <Card>
        <SectionTitle icon={PackageOpen} title="Job Slabs" />
        <CardContent className="p-4">
          <JobSlabsPanel customerId={project.customerId} projectId={id} />
        </CardContent>
      </Card>

      <Card>
        <SectionTitle icon={FileText} title={`Job Notes (${notes.length})`} />
        <CardContent className="p-4">
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
                      <form action={deleteJobNoteAction.bind(null, project.customerId, id, note.id)}>
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

      <Card>
        <SectionTitle icon={ClipboardList} title="Phases" />
        <CardContent className="p-4 text-sm text-muted-foreground">No phases configured yet.</CardContent>
      </Card>

      <Card>
        <SectionTitle icon={AlertCircle} title="Job Issues" />
        <CardContent className="p-4 text-sm text-muted-foreground">No open job issues.</CardContent>
      </Card>

      <Card>
        <SectionTitle icon={Users} title="External Users With Access" />
        <CardContent className="p-4 text-sm text-muted-foreground">
          No permitted external users.
        </CardContent>
      </Card>

      <div className="text-xs text-muted-foreground">
        Change history placeholder. Last CRM update: {formatDateTime(project.updatedAt)}.
      </div>
    </div>
  );
}
