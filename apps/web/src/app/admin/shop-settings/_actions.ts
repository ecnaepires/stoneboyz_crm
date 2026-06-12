'use server';

import { revalidatePath } from 'next/cache';
import { getApiClientWithAuth } from '@/lib/api';

export async function patchWorkDaysAction(formData: FormData): Promise<void> {
  const workDays = formData.getAll('workDay').map(Number);
  const client = await getApiClientWithAuth();
  await client.PATCH('/shop-settings', { body: { workDays } });
  revalidatePath('/admin/shop-settings');
}

export async function createHolidayAction(formData: FormData): Promise<void> {
  const holidayDate = String(formData.get('holidayDate') ?? '').trim();
  const name = String(formData.get('name') ?? '').trim();
  if (!holidayDate || !name) return;
  const client = await getApiClientWithAuth();
  await client.POST('/shop-settings/holidays', { body: { holidayDate, name } });
  revalidatePath('/admin/shop-settings');
}

export async function deleteHolidayAction(holidayId: string): Promise<void> {
  const client = await getApiClientWithAuth();
  await client.DELETE('/shop-settings/holidays/{holidayId}', {
    params: { path: { holidayId } },
  });
  revalidatePath('/admin/shop-settings');
}
