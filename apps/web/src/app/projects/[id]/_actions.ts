'use server';

import { revalidatePath } from 'next/cache';
import { getApiClientWithAuth } from '@/lib/api';

export type ChecklistField =
  | 'depositReceived'
  | 'tearoutRequired'
  | 'tearoutCompleted'
  | 'readyToTemplate'
  | 'approvedForInstall';

type NotesMutationClient = {
  POST: (
    path: '/customers/{customerId}/projects/{projectId}/notes',
    options: { params: { path: { customerId: string; projectId: string } }; body: { body: string } }
  ) => Promise<{ error?: unknown }>;
  DELETE: (
    path: '/customers/{customerId}/projects/{projectId}/notes/{noteId}',
    options: {
      params: { path: { customerId: string; projectId: string; noteId: string } };
      body: Record<string, never>;
    }
  ) => Promise<{ error?: unknown }>;
};

type ChecklistMutationClient = {
  PATCH: (
    path: '/customers/{customerId}/projects/{projectId}/phases/{phaseId}/checklist',
    options: {
      params: { path: { customerId: string; projectId: string; phaseId: string } };
      body: Partial<Record<ChecklistField, boolean>>;
    }
  ) => Promise<{ error?: unknown }>;
};

const toIsoDateTime = (dateValue: FormDataEntryValue | null, timeValue: FormDataEntryValue | null) => {
  const date = typeof dateValue === 'string' ? dateValue : '';
  const time = typeof timeValue === 'string' && timeValue ? timeValue : '08:00';
  return new Date(`${date}T${time}`).toISOString();
};

const toAssigneeIds = (values: FormDataEntryValue[]) => {
  return values
    .filter((value): value is string => typeof value === 'string')
    .map((value) => value.trim())
    .filter(Boolean);
};

export async function addJobNoteAction(customerId: string, projectId: string, formData: FormData) {
  const client = (await getApiClientWithAuth()) as unknown as NotesMutationClient;

  const { error } = await client.POST('/customers/{customerId}/projects/{projectId}/notes', {
    params: { path: { customerId, projectId } },
    body: { body: formData.get('body') as string },
  });

  if (error) {
    throw new Error('Failed to add job note: ' + JSON.stringify(error));
  }

  revalidatePath(`/projects/${projectId}`);
}

export async function updateChecklistAction(
  customerId: string,
  projectId: string,
  phaseId: string,
  field: ChecklistField,
  value: boolean
) {
  const client = (await getApiClientWithAuth()) as unknown as ChecklistMutationClient;

  const { error } = await client.PATCH(
    '/customers/{customerId}/projects/{projectId}/phases/{phaseId}/checklist',
    {
      params: { path: { customerId, projectId, phaseId } },
      body: { [field]: value },
    }
  );

  if (error) {
    throw new Error('Failed to update job checklist: ' + JSON.stringify(error));
  }

  revalidatePath(`/projects/${projectId}`);
}

export async function deleteJobNoteAction(customerId: string, projectId: string, noteId: string) {
  const client = (await getApiClientWithAuth()) as unknown as NotesMutationClient;

  const { error } = await client.DELETE('/customers/{customerId}/projects/{projectId}/notes/{noteId}', {
    params: { path: { customerId, projectId, noteId } },
    body: {},
  });

  if (error) {
    throw new Error('Failed to delete job note: ' + JSON.stringify(error));
  }

  revalidatePath(`/projects/${projectId}`);
}

export async function scheduleJobActivityAction(
  customerId: string,
  projectId: string,
  activityId: string,
  formData: FormData
) {
  const client = await getApiClientWithAuth();
  const scheduledDate = formData.get('scheduledDate');

  if (typeof scheduledDate !== 'string' || scheduledDate.length === 0) {
    throw new Error('Date is required');
  }

  const assigneeIds = toAssigneeIds(formData.getAll('assigneeIds'));
  const { error } = await client.POST(
    '/customers/{customerId}/projects/{projectId}/activities/{activityId}/schedule',
    {
      params: { path: { customerId, projectId, activityId } },
      body: {
        scheduledAt: toIsoDateTime(scheduledDate, formData.get('startTime')),
        durationMinutes: Number(formData.get('durationMinutes') || 60),
        assigneeIds,
      },
    }
  );

  if (error) {
    throw new Error('Failed to schedule job activity: ' + JSON.stringify(error));
  }

  revalidatePath(`/projects/${projectId}`);
  revalidatePath('/schedule');
  revalidatePath('/pipeline');
}

export async function rescheduleJobActivityAction(
  customerId: string,
  projectId: string,
  activityId: string,
  formData: FormData
) {
  const client = await getApiClientWithAuth();
  const scheduledDate = formData.get('scheduledDate');

  if (typeof scheduledDate !== 'string' || scheduledDate.length === 0) {
    throw new Error('Date is required');
  }

  const assigneeIds = toAssigneeIds(formData.getAll('assigneeIds'));
  const { error } = await client.PATCH(
    '/customers/{customerId}/projects/{projectId}/activities/{activityId}/schedule',
    {
      params: { path: { customerId, projectId, activityId } },
      body: {
        scheduledAt: toIsoDateTime(scheduledDate, formData.get('startTime')),
        durationMinutes: Number(formData.get('durationMinutes') || 60),
        assigneeIds,
      },
    }
  );

  if (error) {
    throw new Error('Failed to reschedule job activity: ' + JSON.stringify(error));
  }

  revalidatePath(`/projects/${projectId}`);
  revalidatePath('/schedule');
  revalidatePath('/pipeline');
}
