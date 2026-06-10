import { redirect } from 'next/navigation';
import type { components } from '@stoneboyz/api-client';
import { getApiClientWithAuth } from '@/lib/api';
import { isScheduleAppointmentType } from '@/lib/schedule-links';
import { ScheduleCalendar, type CalendarEvent } from './ScheduleCalendar';

type Customer = components['schemas']['Customer'];
type Project = components['schemas']['Project'];
type ScheduledEvent = components['schemas']['ScheduledEvent'];
type Assignee = components['schemas']['Assignee'];

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const dateFromKey = (key: string) => new Date(`${key}T12:00:00`);

const dateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const addDays = (date: Date, days: number) => new Date(date.getTime() + days * MS_PER_DAY);

const addMonths = (date: Date, months: number) => {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months, 1);
  return next;
};

const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1, 12);

const endOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0, 12);

const monthGridStart = (date: Date) => {
  const monthStart = startOfMonth(date);
  const day = monthStart.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  return addDays(monthStart, mondayOffset);
};

const buildMonthDays = (selectedDate: Date, todayKey: string) => {
  const monthStart = startOfMonth(selectedDate);
  const gridStart = monthGridStart(selectedDate);
  const selectedKey = dateKey(selectedDate);

  return Array.from({ length: 42 }, (_, index) => {
    const date = addDays(gridStart, index);
    const key = dateKey(date);
    return {
      key,
      dayNumber: date.getDate(),
      inMonth: date.getMonth() === monthStart.getMonth(),
      isToday: key === todayKey,
      isSelected: key === selectedKey,
    };
  });
};

const projectTitleById = (projects: Project[]) =>
  new Map(projects.map((project) => [project.id, project.title]));

const normalizeEvent = (
  event: ScheduledEvent,
  customer: Customer,
  projectNames: Map<string, string>,
): CalendarEvent => ({
  id: event.id,
  customerId: event.customerId,
  customerName: customer.name,
  projectId: event.projectId ?? null,
  projectTitle: event.projectId ? projectNames.get(event.projectId) ?? null : null,
  jobActivityId: event.jobActivityId ?? null,
  eventType: event.eventType,
  appointmentType: event.appointmentType ?? null,
  title: event.title,
  scheduledAt: event.scheduledAt,
  durationMinutes: event.durationMinutes,
  assigneeIds: event.assigneeIds,
  address: event.address ?? null,
  status: event.status,
});

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; customerId?: string; projectId?: string; appointmentType?: string }>;
}) {
  const { date, customerId: requestedCustomerId = '', projectId = '', appointmentType } = await searchParams;
  const selectedDate = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? dateFromKey(date) : new Date();
  const todayKey = dateKey(new Date());
  const client = await getApiClientWithAuth();

  const [{ data: customersRes, error: customersError }, { data: projectsRes }, { data: assigneesRes }] = await Promise.all([
    client.GET('/customers', { params: { query: { limit: 100 } } }),
    client.GET('/projects', { params: { query: { limit: 100 } } }),
    client.GET('/assignees', {}),
  ]);

  if (customersError) {
    if ('statusCode' in customersError && customersError.statusCode === 401) {
      redirect('/sign-in');
    }

    return <div className="text-red-600">Failed to load calendar customers: {JSON.stringify(customersError)}</div>;
  }

  const customers = customersRes?.data ?? [];
  const projects = projectsRes?.data ?? [];
  const assignees = (assigneesRes ?? []) as Assignee[];
  const selectedProject = projectId ? projects.find((project) => project.id === projectId) ?? null : null;
  const selectedCustomerId = selectedProject?.customerId ?? requestedCustomerId;
  const selectedProjectId = selectedProject?.customerId === selectedCustomerId ? selectedProject.id : '';
  const selectedAppointmentType = isScheduleAppointmentType(appointmentType) ? appointmentType : 'template';
  const projectNames = projectTitleById(projects);
  const rangeStart = monthGridStart(selectedDate);
  const rangeEnd = addDays(endOfMonth(selectedDate), 1);
  const visibleCustomers = selectedCustomerId
    ? customers.filter((customer) => customer.id === selectedCustomerId)
    : customers;

  const eventsResponses = await Promise.all(
    visibleCustomers.map(async (customer) => ({
      customer,
      response: await client.GET('/customers/{customerId}/events', {
        params: {
          path: { customerId: customer.id },
          query: {
            limit: 100,
            from: dateKey(rangeStart),
            to: dateKey(rangeEnd),
          },
        },
      }),
    })),
  );

  const events = eventsResponses.flatMap(({ customer, response }) =>
    (response.data?.data ?? []).map((event) => normalizeEvent(event, customer, projectNames)),
  );

  events.sort((left, right) => new Date(left.scheduledAt).getTime() - new Date(right.scheduledAt).getTime());

  return (
    <ScheduleCalendar
      customers={customers.map((customer) => ({ id: customer.id, name: customer.name }))}
      projects={projects.map((project) => ({ id: project.id, title: project.title, customerId: project.customerId }))}
      assignees={assignees.map((assignee) => ({
        id: assignee.id,
        name: assignee.name,
        assigneeType: assignee.assigneeType,
      }))}
      events={events}
      days={buildMonthDays(selectedDate, todayKey)}
      selectedDateKey={dateKey(selectedDate)}
      monthLabel={new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(selectedDate)}
      previousMonthDateKey={dateKey(addMonths(selectedDate, -1))}
      nextMonthDateKey={dateKey(addMonths(selectedDate, 1))}
      todayDateKey={todayKey}
      selectedCustomerId={selectedCustomerId}
      initialProjectId={selectedProjectId}
      initialAppointmentType={selectedAppointmentType}
    />
  );
}
