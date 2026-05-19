import { createClient } from '@stoneboyz/api-client';
import type { StoneboyzApiClient } from '@stoneboyz/api-client';
import { cookies } from 'next/headers';

export function getApiClient(): StoneboyzApiClient {
  const baseUrl = process.env.API_BASE_URL;
  if (!baseUrl) {
    throw new Error('API_BASE_URL environment variable is not set');
  }
  return createClient({ baseUrl });
}

export async function getApiClientWithAuth(): Promise<StoneboyzApiClient> {
  const baseUrl = process.env.API_BASE_URL;
  if (!baseUrl) {
    throw new Error('API_BASE_URL environment variable is not set');
  }
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('better-auth.session_token');
  const reqHeaders: Record<string, string> = {};
  if (sessionCookie) {
    reqHeaders['Cookie'] = `better-auth.session_token=${sessionCookie.value}`;
  }
  return createClient({ baseUrl, headers: reqHeaders });
}
