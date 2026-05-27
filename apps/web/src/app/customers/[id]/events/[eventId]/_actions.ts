'use server';

import { revalidatePath } from 'next/cache';
import { getApiClientWithAuth } from '@/lib/api';

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

export async function addActivityNoteAction(customerId: string, eventId: string, formData: FormData) {
  const client = (await getApiClientWithAuth()) as unknown as NotesMutationClient;

  const { error } = await client.POST('/customers/{customerId}/events/{eventId}/notes', {
    params: { path: { customerId, eventId } },
    body: { body: formData.get('body') as string },
  });

  if (error) {
    throw new Error('Failed to add activity note: ' + JSON.stringify(error));
  }

  revalidatePath(`/customers/${customerId}/events/${eventId}`);
}

export async function deleteActivityNoteAction(customerId: string, eventId: string, noteId: string) {
  const client = (await getApiClientWithAuth()) as unknown as NotesMutationClient;

  const { error } = await client.DELETE('/customers/{customerId}/events/{eventId}/notes/{noteId}', {
    params: { path: { customerId, eventId, noteId } },
    body: {},
  });

  if (error) {
    throw new Error('Failed to delete activity note: ' + JSON.stringify(error));
  }

  revalidatePath(`/customers/${customerId}/events/${eventId}`);
}
