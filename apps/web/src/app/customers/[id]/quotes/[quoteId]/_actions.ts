'use server';

import { revalidatePath } from 'next/cache';
import { getApiClientWithAuth } from '@/lib/api';

type NotesMutationClient = {
  POST: (
    path: '/customers/{customerId}/quotes/{quoteId}/notes',
    options: {
      params: { path: { customerId: string; quoteId: string } };
      body: { body: string; isPublic: boolean };
    }
  ) => Promise<{ error?: unknown }>;
  DELETE: (
    path: '/customers/{customerId}/quotes/{quoteId}/notes/{noteId}',
    options: {
      params: { path: { customerId: string; quoteId: string; noteId: string } };
      body: Record<string, never>;
    }
  ) => Promise<{ error?: unknown }>;
};

export async function addQuoteNoteAction(customerId: string, quoteId: string, formData: FormData) {
  const client = (await getApiClientWithAuth()) as unknown as NotesMutationClient;

  const { error } = await client.POST('/customers/{customerId}/quotes/{quoteId}/notes', {
    params: { path: { customerId, quoteId } },
    body: {
      body: formData.get('body') as string,
      isPublic: formData.get('isPublic') === 'on',
    },
  });

  if (error) {
    throw new Error('Failed to add quote note: ' + JSON.stringify(error));
  }

  revalidatePath(`/customers/${customerId}/quotes/${quoteId}`);
}

export async function deleteQuoteNoteAction(customerId: string, quoteId: string, noteId: string) {
  const client = (await getApiClientWithAuth()) as unknown as NotesMutationClient;

  const { error } = await client.DELETE('/customers/{customerId}/quotes/{quoteId}/notes/{noteId}', {
    params: { path: { customerId, quoteId, noteId } },
    body: {},
  });

  if (error) {
    throw new Error('Failed to delete quote note: ' + JSON.stringify(error));
  }

  revalidatePath(`/customers/${customerId}/quotes/${quoteId}`);
}
