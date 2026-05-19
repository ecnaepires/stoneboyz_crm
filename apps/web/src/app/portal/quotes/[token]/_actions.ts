'use server';

import { redirect } from 'next/navigation';
import { getApiClient } from '@/lib/api';

export async function acceptPortalQuoteAction(token: string) {
  const client = getApiClient();
  const { error } = await client.POST('/portal/quotes/{token}/accept', {
    params: { path: { token } },
  });
  if (error) throw new Error('Failed to accept quote');
  redirect(`/portal/quotes/${token}`);
}

export async function rejectPortalQuoteAction(token: string) {
  const client = getApiClient();
  const { error } = await client.POST('/portal/quotes/{token}/reject', {
    params: { path: { token } },
  });
  if (error) throw new Error('Failed to reject quote');
  redirect(`/portal/quotes/${token}`);
}
