'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { movableFollowers } from '@stoneboyz/domain';
import type { components } from '@stoneboyz/api-client';
import { getApiClientWithAuth } from '@/lib/api';
import { buildScheduleHref } from '@/lib/schedule-links';

type JobActivity = components['schemas']['JobActivity'];

type ScheduledEventType = 'appointment' | 'shop_job';
type AppointmentType =
  | 'template'
  | 'deposit'
  | 'material'
  | 'cut'
  | 'fabrication'
  | 'install'
  | 'invoice'
  | 'repair'
  | 'other';

const toOptionalString = (value: FormDataEntryValue | null) => {
  const stringValue = typeof value === 'string' ? value.trim() : '';
  return stringValue ? stringValue : undefined;
};

const toAssigneeIds = (values: FormDataEntryValue[]) => {
  return values
    .filter((value): value is string => typeof value === 'string')
    .map((assignee) => assignee.trim())
    .filter(Boolean);
};

const toIsoDateTime = (dateValue: FormDataEntryValue | null, timeValue: FormDataEntryValue | null) => {
  const date = typeof dateValue === 'string' ? dateValue : '';
  const time = typeof timeValue === 'string' && timeValue ? timeValue : '08:00';
  return new Date(`${date}T${time}`).toISOString();
};

const activityTitle = (eventType: ScheduledEventType, appointmentType: AppointmentType | undefined) => {
  if (eventType === 'shop_job') {
    return 'Shop Job';
  }

  const activity = appointmentType ?? 'other';
  return activity
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export async function createScheduleEventAction(formData: FormData) {
  const client = await getApiClientWithAuth();

  const customerId = toOptionalString(formData.get('customerId'));
  if (!customerId) {
    throw new Error('Customer is required');
  }

  const eventType = (formData.get('eventType') || 'appointment') as ScheduledEventType;
  const appointmentType = toOptionalString(formData.get('appointmentType')) as AppointmentType | undefined;
  const projectId = toOptionalString(formData.get('projectId'));
  const address = toOptionalString(formData.get('address'));
  const scheduledDate = toOptionalString(formData.get('scheduledDate'));
  const assigneeIds = toAssigneeIds(formData.getAll('assigneeIds'));

  if (!scheduledDate) {
    throw new Error('Date is required');
  }

  const { error } = await client.POST('/customers/{customerId}/events', {
      params: { path: { customerId } },
      body: {
        eventType,
      title: String(formData.get('title') || '').trim() || activityTitle(eventType, appointmentType),
      scheduledAt: toIsoDateTime(formData.get('scheduledDate'), formData.get('startTime')),
      durationMinutes: Number(formData.get('durationMinutes') || 60),
      assigneeIds,
      ...(eventType === 'appointment' ? { appointmentType: appointmentType ?? 'other' } : {}),
      ...(projectId ? { projectId } : {}),
      ...(address ? { address } : {}),
    },
  });

  if (error) {
    throw new Error('Failed to create scheduled event: ' + JSON.stringify(error));
  }

  revalidatePath('/schedule');
  revalidatePath('/pipeline');
  revalidatePath(`/customers/${customerId}/events`);
  redirect(
    buildScheduleHref({
      date: scheduledDate,
      customerId,
      projectId,
      appointmentType: eventType === 'appointment' ? appointmentType : undefined,
    }),
  );
}

const moveScheduledAtToDate = (scheduledAt: string, dateKey: string) => {
  const timePart = scheduledAt.includes('T') ? scheduledAt.slice(scheduledAt.indexOf('T') + 1) : '08:00:00.000Z';
  return `${dateKey}T${timePart}`;
};

export async function moveScheduleEventToDateAction(input: {
  customerId: string;
  eventId: string;
  scheduledAt: string;
  dateKey: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const client = await getApiClientWithAuth();
  const nextScheduledAt = moveScheduledAtToDate(input.scheduledAt, input.dateKey);

  const { error } = await client.PATCH('/customers/{customerId}/events/{eventId}', {
    params: { path: { customerId: input.customerId, eventId: input.eventId } },
    body: {
      scheduledAt: nextScheduledAt,
    },
  });

  if (error) {
    return {
      ok: false,
      message: 'This activity could not be moved. Scheduled or confirmed activities can be rescheduled.',
    };
  }

  revalidatePath('/schedule');
  revalidatePath('/pipeline');
  revalidatePath(`/customers/${input.customerId}/events/${input.eventId}`);

  return { ok: true };
}

export async function prepareScheduleEventMoveAction(input: {
  customerId: string;
  projectId: string | null;
  jobActivityId: string | null;
}): Promise<
  | { ok: true; mode: 'direct'; followers: [] }
  | { ok: true; mode: 'activity'; followers: { id: string; title: string }[] }
  | { ok: false; message: string }
> {
  if (!input.projectId || !input.jobActivityId) {
    return { ok: true, mode: 'direct', followers: [] };
  }

  const client = await getApiClientWithAuth();
  const { data, error } = await client.GET(
    '/customers/{customerId}/projects/{projectId}/activities',
    {
      params: {
        path: {
          customerId: input.customerId,
          projectId: input.projectId,
        },
      },
    },
  );

  if (error || !data) {
    return {
      ok: false,
      message: 'This activity move could not be prepared.',
    };
  }

  const activities = data as JobActivity[];
  const anchor = activities.find((activity) => activity.id === input.jobActivityId);

  if (!anchor) {
    return {
      ok: false,
      message: 'This job activity could not be found.',
    };
  }

  return {
    ok: true,
    mode: 'activity',
    followers: movableFollowers(activities, anchor).map((follower) => ({
      id: follower.id,
      title: follower.title,
    })),
  };
}

export async function confirmScheduleEventMoveAction(input: {
  customerId: string;
  eventId: string;
  projectId: string | null;
  jobActivityId: string | null;
  scheduledAt: string;
  dateKey: string;
  durationMinutes: number;
  assigneeIds: string[];
}): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!input.projectId || !input.jobActivityId) {
    return moveScheduleEventToDateAction(input);
  }

  const client = await getApiClientWithAuth();
  const nextScheduledAt = moveScheduledAtToDate(input.scheduledAt, input.dateKey);
  const { error } = await client.PATCH(
    '/customers/{customerId}/projects/{projectId}/activities/{activityId}/schedule',
    {
      params: {
        path: {
          customerId: input.customerId,
          projectId: input.projectId,
          activityId: input.jobActivityId,
        },
      },
      body: {
        scheduledAt: nextScheduledAt,
        durationMinutes: input.durationMinutes,
        assigneeIds: input.assigneeIds,
      },
    },
  );

  if (error) {
    return {
      ok: false,
      message: 'This job activity could not be moved. Scheduled or confirmed job activities can be rescheduled.',
    };
  }

  revalidatePath('/schedule');
  revalidatePath('/pipeline');
  revalidatePath(`/projects/${input.projectId}/activities/${input.jobActivityId}`);
  revalidatePath(`/customers/${input.customerId}/events/${input.eventId}`);

  return { ok: true };
}
