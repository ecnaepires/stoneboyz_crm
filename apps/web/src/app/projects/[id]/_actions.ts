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

type ProjectSlabMutationClient = {
  POST: (
    path: '/customers/{customerId}/projects/{projectId}/slabs',
    options: { params: { path: { customerId: string; projectId: string } }; body: { slabId: string } }
  ) => Promise<{ error?: unknown }>;
  DELETE: (
    path: '/customers/{customerId}/projects/{projectId}/slabs/{slabId}',
    options: { params: { path: { customerId: string; projectId: string; slabId: string } }; body: Record<string, never> }
  ) => Promise<{ error?: unknown }>;
};

export async function linkSlabToJobAction(customerId: string, projectId: string, slabId: string) {
  const client = (await getApiClientWithAuth()) as unknown as ProjectSlabMutationClient;

  const { error } = await client.POST('/customers/{customerId}/projects/{projectId}/slabs', {
    params: { path: { customerId, projectId } },
    body: { slabId },
  });

  if (error) {
    throw new Error('Failed to link slab: ' + JSON.stringify(error));
  }

  revalidatePath(`/projects/${projectId}`);
}

export async function detachSlabFromJobAction(customerId: string, projectId: string, slabId: string) {
  const client = (await getApiClientWithAuth()) as unknown as ProjectSlabMutationClient;

  const { error } = await client.DELETE('/customers/{customerId}/projects/{projectId}/slabs/{slabId}', {
    params: { path: { customerId, projectId, slabId } },
    body: {},
  });

  if (error) {
    throw new Error('Failed to detach slab: ' + JSON.stringify(error));
  }

  revalidatePath(`/projects/${projectId}`);
}

type CustomerProjectsClient = {
  GET: (
    path: '/customers/{customerId}/projects',
    options: { params: { path: { customerId: string } } }
  ) => Promise<{ data?: { data?: Array<{ id: string; title: string }> } }>;
};

export async function listCustomerProjectsAction(
  customerId: string
): Promise<Array<{ id: string; title: string }>> {
  const client = (await getApiClientWithAuth()) as unknown as CustomerProjectsClient;
  const { data } = await client.GET('/customers/{customerId}/projects', {
    params: { path: { customerId } },
  });
  return (data?.data ?? []).map((project) => ({ id: project.id, title: project.title }));
}

async function apiOriginWithAuthHeaders(): Promise<{ origin: string; headers: Record<string, string> }> {
  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('better-auth.session_token');
  const baseUrl = process.env.API_BASE_URL;
  if (!baseUrl) throw new Error('API_BASE_URL not set');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (sessionCookie) headers['Cookie'] = `better-auth.session_token=${sessionCookie.value}`;
  return { origin: new URL(baseUrl).origin, headers };
}

export async function reassignSlabAction(
  sourceCustomerId: string,
  sourceProjectId: string,
  slabId: string,
  formData: FormData
) {
  const targetCustomerId = (formData.get('targetCustomerId') as string)?.trim();
  const targetProjectId = (formData.get('targetProjectId') as string)?.trim();
  const reason = (formData.get('reason') as string)?.trim();
  if (!targetCustomerId || !targetProjectId) throw new Error('Choose a target job');
  if (!reason) throw new Error('A reason is required to reassign material');

  const { origin, headers } = await apiOriginWithAuthHeaders();
  const res = await fetch(
    `${origin}/api/v1/customers/${sourceCustomerId}/projects/${sourceProjectId}/slabs/${slabId}/reassign`,
    { method: 'POST', headers, body: JSON.stringify({ targetCustomerId, targetProjectId, reason }) }
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error('Failed to reassign slab: ' + body);
  }

  revalidatePath(`/projects/${sourceProjectId}`);
}

export interface FindMaterialRow {
  id: string;
  tagCode: string | null;
  stoneType: string;
  lengthIn: number;
  widthIn: number;
  ownership: string;
}

export async function findMaterialForJobAction(
  minLengthIn: number,
  minWidthIn: number
): Promise<FindMaterialRow[]> {
  const { origin, headers } = await apiOriginWithAuthHeaders();
  const query = new URLSearchParams({ minLengthIn: String(minLengthIn), minWidthIn: String(minWidthIn) });
  const res = await fetch(`${origin}/api/v1/inventory/slabs/find-material?${query.toString()}`, { headers });
  if (!res.ok) return [];
  const body = (await res.json()) as { data?: Array<{ slab: FindMaterialRow }> };
  return (body.data ?? []).map((result) => result.slab);
}
