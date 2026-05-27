'use server';

import { revalidatePath } from 'next/cache';
import { getApiClientWithAuth } from '@/lib/api';

const validRoles = ['admin', 'salesperson', 'templater', 'cutter', 'fabricator', 'installer', 'service_tech'] as const;

export async function updateRoleAction(userId: string, roleOrFormData: string | FormData) {
  const roleValue =
    typeof roleOrFormData === 'string'
      ? roleOrFormData
      : String(roleOrFormData.get('role') ?? '').trim();
  const role = validRoles.find((value) => value === roleValue);

  if (!role) {
    throw new Error(`Invalid role: ${roleValue}`);
  }

  const client = await getApiClientWithAuth();
  const { error } = await client.PATCH('/users/{userId}/role', {
    params: { path: { userId } },
    body: { role }
  });

  if (error) {
    throw new Error('Failed to update user role: ' + JSON.stringify(error));
  }

  revalidatePath('/admin/users');
}
