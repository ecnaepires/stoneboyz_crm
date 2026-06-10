'use server';

import { revalidatePath } from 'next/cache';
import { getApiClientWithAuth } from '@/lib/api';

type EventMutationClient = {
  POST: (
    path:
      | '/customers/{customerId}/events/{eventId}/confirm'
      | '/customers/{customerId}/events/{eventId}/start'
      | '/customers/{customerId}/events/{eventId}/finish'
      | '/customers/{customerId}/events/{eventId}/cancel',
    options: { params: { path: { customerId: string; eventId: string } }; body: Record<string, never> }
  ) => Promise<{ error?: unknown }>;
};

type NotesMutationClient = {
  POST: (
    path: '/customers/{customerId}/events/{eventId}/notes',
    options: { params: { path: { customerId: string; eventId: string } }; body: { body: string } }
  ) => Promise<{ error?: unknown }>;
  DELETE: (
    path: '/customers/{customerId}/events/{eventId}/notes/{noteId}',
    options: {
      params: { path: { customerId: string; eventId: string; noteId: string } };
      body: Record<string, never>;
    }
  ) => Promise<{ error?: unknown }>;
};

const revalidateActivity = (projectId: string, activityId: string) => {
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/activities/${activityId}`);
  revalidatePath('/schedule');
  revalidatePath('/pipeline');
};

const transitionEvent = async (
  customerId: string,
  projectId: string,
  activityId: string,
  eventId: string,
  action: 'confirm' | 'start' | 'finish' | 'cancel'
) => {
  const client = (await getApiClientWithAuth()) as unknown as EventMutationClient;
  const path =
    action === 'confirm'
      ? '/customers/{customerId}/events/{eventId}/confirm'
      : action === 'start'
        ? '/customers/{customerId}/events/{eventId}/start'
        : action === 'finish'
          ? '/customers/{customerId}/events/{eventId}/finish'
          : '/customers/{customerId}/events/{eventId}/cancel';
  const { error } = await client.POST(path, {
    params: { path: { customerId, eventId } },
    body: {},
  });

  if (error) {
    throw new Error(`Failed to ${action} activity: ${JSON.stringify(error)}`);
  }

  revalidateActivity(projectId, activityId);
};

export async function confirmActivityAction(customerId: string, projectId: string, activityId: string, eventId: string) {
  await transitionEvent(customerId, projectId, activityId, eventId, 'confirm');
}

export async function startActivityAction(customerId: string, projectId: string, activityId: string, eventId: string) {
  await transitionEvent(customerId, projectId, activityId, eventId, 'start');
}

export async function finishActivityAction(customerId: string, projectId: string, activityId: string, eventId: string) {
  await transitionEvent(customerId, projectId, activityId, eventId, 'finish');
}

export async function cancelActivityAction(customerId: string, projectId: string, activityId: string, eventId: string) {
  await transitionEvent(customerId, projectId, activityId, eventId, 'cancel');
}

export async function addActivityEditorNoteAction(
  customerId: string,
  projectId: string,
  activityId: string,
  eventId: string,
  formData: FormData
) {
  const client = (await getApiClientWithAuth()) as unknown as NotesMutationClient;
  const { error } = await client.POST('/customers/{customerId}/events/{eventId}/notes', {
    params: { path: { customerId, eventId } },
    body: { body: formData.get('body') as string },
  });

  if (error) {
    throw new Error('Failed to add activity note: ' + JSON.stringify(error));
  }

  revalidateActivity(projectId, activityId);
}

export async function deleteActivityEditorNoteAction(
  customerId: string,
  projectId: string,
  activityId: string,
  eventId: string,
  noteId: string
) {
  const client = (await getApiClientWithAuth()) as unknown as NotesMutationClient;
  const { error } = await client.DELETE('/customers/{customerId}/events/{eventId}/notes/{noteId}', {
    params: { path: { customerId, eventId, noteId } },
    body: {},
  });

  if (error) {
    throw new Error('Failed to delete activity note: ' + JSON.stringify(error));
  }

  revalidateActivity(projectId, activityId);
}
