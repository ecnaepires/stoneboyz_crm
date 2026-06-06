'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getActorUserId } from '@/lib/actor';
import { getApiClientWithAuth } from '@/lib/api';
import { buildScheduleHref } from '@/lib/schedule-links';

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

const toAssigneeUserIds = (values: FormDataEntryValue[]) => {
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
  const actorUserId = await getActorUserId();

  const customerId = toOptionalString(formData.get('customerId'));
  if (!customerId) {
    throw new Error('Customer is required');
  }

  const eventType = (formData.get('eventType') || 'appointment') as ScheduledEventType;
  const appointmentType = toOptionalString(formData.get('appointmentType')) as AppointmentType | undefined;
  const projectId = toOptionalString(formData.get('projectId'));
  const address = toOptionalString(formData.get('address'));
  const scheduledDate = toOptionalString(formData.get('scheduledDate'));
  const assigneeUserIds = toAssigneeUserIds(formData.getAll('assigneeUserIds'));

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
      assigneeUserIds: assigneeUserIds.length > 0 ? assigneeUserIds : [actorUserId],
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
