import { cookies } from 'next/headers';
import { PIPELINE_STAGE_VALUES } from '@stoneboyz/domain';
import { PipelineBoard, type PipelineCard } from './PipelineBoard';

async function fetchBoard(): Promise<PipelineCard[]> {
  const baseUrl = process.env.API_BASE_URL;
  if (!baseUrl) {
    throw new Error('API_BASE_URL environment variable is not set');
  }

  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('better-auth.session_token');
  const headers: Record<string, string> = {};
  if (sessionCookie) {
    headers['Cookie'] = `better-auth.session_token=${sessionCookie.value}`;
  }

  const response = await fetch(`${baseUrl}/pipeline`, { headers, cache: 'no-store' });
  if (!response.ok) {
    throw new Error('Failed to load pipeline');
  }

  return (await response.json()) as PipelineCard[];
}

export default async function PipelinePage() {
  const cards = await fetchBoard();
  return <PipelineBoard cards={cards} stages={PIPELINE_STAGE_VALUES} />;
}
