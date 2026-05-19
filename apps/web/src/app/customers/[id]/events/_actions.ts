'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getActorUserId } from '@/lib/actor';
import { getApiClientWithAuth } from '@/lib/api';

type ScheduledEventType = 'appointment' | 'shop_job';
type AppointmentType = 'measure' | 'template' | 'install' | 'follow_up' | 'other';

const toOptionalString = (value: FormDataEntryValue | null) => {
  const stringValue = typeof value === 'string' ? value.trim() : '';
  return stringValue ? stringValue : undefined;
};

const toOptionalNullableString = (value: FormDataEntryValue | null) => {
  const stringValue = typeof value === 'string' ? value.trim() : '';
  return stringValue ? stringValue : null;
};

const toIsoDateTime = (value: FormDataEntryValue | null) => {
  const stringValue = typeof value === 'string' ? value : '';
  return new Date(stringValue).toISOString();
};

const toAssigneeUserIds = (values: FormDataEntryValue[]) => {
  return values
    .filter((value): value is string => typeof value === 'string')
    .map((assignee) => assignee.trim())
    .filter(Boolean);
};

export async function createEventAction(customerId: string, formData: FormData) {
  const client = await getApiClientWithAuth();
  const actorUserId = await getActorUserId();

  const eventType = formData.get('eventType') as ScheduledEventType;
  const projectId = toOptionalString(formData.get('projectId'));
  const appointmentType = toOptionalString(formData.get('appointmentType')) as
    | AppointmentType
    | undefined;
  const address = toOptionalString(formData.get('address'));
  const notes = toOptionalString(formData.get('notes'));
  const assigneeUserIds = toAssigneeUserIds(formData.getAll('assigneeUserIds'));

  const { data, error } = await client.POST('/customers/{customerId}/events', {
    params: { path: { customerId } },
    body: {
      eventType,
      title: formData.get('title') as string,
      scheduledAt: toIsoDateTime(formData.get('scheduledAt')),
      durationMinutes: Number(formData.get('durationMinutes') || 60),
      assigneeUserIds: assigneeUserIds.length > 0 ? assigneeUserIds : [actorUserId],
      ...(appointmentType ? { appointmentType } : {}),
      ...(projectId ? { projectId } : {}),
      ...(address ? { address } : {}),
      ...(notes ? { notes } : {}),
    },
  });

  if (error) {
    throw new Error('Failed to create event: ' + JSON.stringify(error));
  }

  redirect(`/customers/${customerId}/events/${data.id}`);
}

export async function updateEventAction(customerId: string, eventId: string, formData: FormData) {
  const client = await getApiClientWithAuth();
  const actorUserId = await getActorUserId();

  const appointmentType = toOptionalString(formData.get('appointmentType')) as
    | AppointmentType
    | undefined;
  const assigneeUserIds = toAssigneeUserIds(formData.getAll('assigneeUserIds'));

  const { error } = await client.PATCH('/customers/{customerId}/events/{eventId}', {
    params: { path: { customerId, eventId } },
    body: {
      projectId: toOptionalNullableString(formData.get('projectId')),
      title: formData.get('title') as string,
      scheduledAt: toIsoDateTime(formData.get('scheduledAt')),
      durationMinutes: Number(formData.get('durationMinutes') || 60),
      assigneeUserIds: assigneeUserIds.length > 0 ? assigneeUserIds : [actorUserId],
      address: toOptionalNullableString(formData.get('address')),
      notes: toOptionalNullableString(formData.get('notes')),
      ...(appointmentType ? { appointmentType } : {}),
    },
  });

  if (error) {
    throw new Error('Failed to update event: ' + JSON.stringify(error));
  }

  revalidatePath(`/customers/${customerId}/events/${eventId}`);
  redirect(`/customers/${customerId}/events/${eventId}`);
}

export async function confirmEventAction(customerId: string, eventId: string) {
  const client = await getApiClientWithAuth();

  const { error } = await client.POST('/customers/{customerId}/events/{eventId}/confirm', {
    params: { path: { customerId, eventId } },
    body: {},
  });

  if (error) {
    throw new Error('Failed to confirm event: ' + JSON.stringify(error));
  }

  revalidatePath(`/customers/${customerId}/events/${eventId}`);
}

export async function startEventAction(customerId: string, eventId: string) {
  const client = await getApiClientWithAuth();

  const { error } = await client.POST('/customers/{customerId}/events/{eventId}/start', {
    params: { path: { customerId, eventId } },
    body: {},
  });

  if (error) {
    throw new Error('Failed to start event: ' + JSON.stringify(error));
  }

  revalidatePath(`/customers/${customerId}/events/${eventId}`);
}

export async function completeEventAction(customerId: string, eventId: string) {
  const client = await getApiClientWithAuth();

  const { error } = await client.POST('/customers/{customerId}/events/{eventId}/complete', {
    params: { path: { customerId, eventId } },
    body: {},
  });

  if (error) {
    throw new Error('Failed to complete event: ' + JSON.stringify(error));
  }

  revalidatePath(`/customers/${customerId}/events/${eventId}`);
}

export async function cancelEventAction(customerId: string, eventId: string) {
  const client = await getApiClientWithAuth();

  const { error } = await client.POST('/customers/{customerId}/events/{eventId}/cancel', {
    params: { path: { customerId, eventId } },
    body: {},
  });

  if (error) {
    throw new Error('Failed to cancel event: ' + JSON.stringify(error));
  }

  revalidatePath(`/customers/${customerId}/events/${eventId}`);
}

export async function archiveEventAction(customerId: string, eventId: string) {
  const client = await getApiClientWithAuth();

  const { error } = await client.POST('/customers/{customerId}/events/{eventId}/archive', {
    params: { path: { customerId, eventId } },
    body: {},
  });

  if (error) {
    throw new Error('Failed to archive event: ' + JSON.stringify(error));
  }

  revalidatePath(`/customers/${customerId}/events/${eventId}`);
  redirect(`/customers/${customerId}/events`);
}
