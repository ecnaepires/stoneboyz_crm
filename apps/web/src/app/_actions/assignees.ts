'use server';

import { getApiClientWithAuth } from '@/lib/api';

export async function createAssigneesAction(names: string) {
  const client = await getApiClientWithAuth();

  const lines = names
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    throw new Error('At least one assignee name is required');
  }

  for (const name of lines) {
    const { error } = await client.POST('/assignees', {
      body: { name, assigneeType: 'person' },
    });

    if (error) {
      throw new Error('Failed to create assignee: ' + JSON.stringify(error));
    }
  }
}
