'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getApiClient } from '@/lib/api';
import { getActorUserId } from '@/lib/actor';

type ProjectStatus = 'draft' | 'active' | 'completed';

export async function createProjectAction(formData: FormData) {
  const client = getApiClient();
  const actorUserId = await getActorUserId();
  const ownerUserId = actorUserId;

  const customerId = formData.get('customerId') as string;
  const title = formData.get('title') as string;
  const description = formData.get('description') as string | null;
  const status = formData.get('status') as ProjectStatus;

  const { data, error } = await client.POST('/projects', {
    body: {
      actorUserId,
      customerId,
      title,
      status,
      ownerUserId,
      ...(description ? { description } : {}),
    },
  });

  if (error) {
    throw new Error('Failed to create project: ' + JSON.stringify(error));
  }

  redirect(`/projects/${data.id}`);
}

export async function updateProjectAction(projectId: string, formData: FormData) {
  const client = getApiClient();
  const actorUserId = await getActorUserId();

  const customerId = formData.get('customerId') as string;
  const title = formData.get('title') as string;
  const description = formData.get('description') as string | null;
  const status = formData.get('status') as ProjectStatus;

  const { error } = await client.PATCH('/projects/{projectId}', {
    params: { path: { projectId } },
    body: {
      actorUserId,
      customerId,
      title,
      status,
      description: description ? description : null,
    },
  });

  if (error) {
    throw new Error('Failed to update project: ' + JSON.stringify(error));
  }

  revalidatePath(`/projects/${projectId}`);
  redirect(`/projects/${projectId}`);
}

export async function archiveProjectAction(projectId: string) {
  const client = getApiClient();
  const actorUserId = await getActorUserId();

  const { error } = await client.POST('/projects/{projectId}/archive', {
    params: { path: { projectId } },
    body: { actorUserId },
  });

  if (error) {
    throw new Error('Failed to archive project: ' + JSON.stringify(error));
  }

  redirect('/projects');
}
