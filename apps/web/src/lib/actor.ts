import { auth } from './auth';
import { headers } from 'next/headers';

export async function getActorUserId(): Promise<string> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error('Not authenticated');
  return session.user.id;
}
