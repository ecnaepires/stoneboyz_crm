'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import type { PipelineStage } from '@stoneboyz/domain';

export type SetStageResult = { ok: true } | { ok: false; code: string; message: string };

export async function setProjectStageAction(
  projectId: string,
  stage: PipelineStage,
  allowBackward = false
): Promise<SetStageResult> {
  const baseUrl = process.env.API_BASE_URL;
  if (!baseUrl) {
    throw new Error('API_BASE_URL environment variable is not set');
  }

  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('better-auth.session_token');
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (sessionCookie) {
    headers['Cookie'] = `better-auth.session_token=${sessionCookie.value}`;
  }

  const response = await fetch(`${baseUrl}/projects/${projectId}/stage`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(allowBackward ? { stage, allowBackward: true } : { stage }),
    cache: 'no-store'
  });

  if (response.ok) {
    revalidatePath('/pipeline');
    return { ok: true };
  }

  const body = (await response.json().catch(() => ({}))) as { code?: string; message?: string };
  return { ok: false, code: body.code ?? 'ERROR', message: body.message ?? 'Failed to update stage' };
}
