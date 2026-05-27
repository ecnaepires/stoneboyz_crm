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
