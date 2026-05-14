import { createClient } from '@stoneboyz/api-client';
import type { StoneboyzApiClient } from '@stoneboyz/api-client';

export function getApiClient(): StoneboyzApiClient {
  const baseUrl = process.env.API_BASE_URL;
  if (!baseUrl) {
    throw new Error('API_BASE_URL environment variable is not set');
  }
  return createClient({ baseUrl });
}
