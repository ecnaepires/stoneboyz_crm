'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getApiClientWithAuth } from '@/lib/api';

const toOptionalString = (value: FormDataEntryValue | null) => {
  const stringValue = typeof value === 'string' ? value.trim() : '';
  return stringValue ? stringValue : undefined;
};

const toOptionalNullableString = (value: FormDataEntryValue | null) => {
  const stringValue = typeof value === 'string' ? value.trim() : '';
  return stringValue ? stringValue : null;
};

const toRequiredNumber = (value: FormDataEntryValue | null) => parseFloat(String(value ?? '0'));
const toRequiredSlabThicknessCm = (value: FormDataEntryValue | null): 2 | 3 => {
  const parsed = toRequiredNumber(value);
  if (parsed === 2 || parsed === 3) return parsed;
  throw new Error('Slab thickness must be 2cm or 3cm');
};
const slabValueCents = (lengthIn: number, widthIn: number, valuePerSqFt: number) => {
  const squareFeet = (lengthIn * widthIn) / 144;
  return Math.round(squareFeet * valuePerSqFt * 100);
};

export async function createSlabAction(formData: FormData) {
  const client = await getApiClientWithAuth();
  const lotNumber = toOptionalString(formData.get('lotNumber'));
  const bundleNumber = toOptionalString(formData.get('bundleNumber'));
  const warehouseLocation = toOptionalString(formData.get('warehouseLocation'));
  const notes = toOptionalString(formData.get('notes'));
  const lengthIn = toRequiredNumber(formData.get('lengthIn'));
  const widthIn = toRequiredNumber(formData.get('widthIn'));
  const valuePerSqFt = toRequiredNumber(formData.get('valuePerSqFt'));

  const { data, error } = await client.POST('/inventory/slabs', {
    body: {
      stoneType: formData.get('stoneType') as string,
      finish: formData.get('finish') as 'polished' | 'honed' | 'brushed' | 'leathered' | 'sandblasted',
      qualityGrade: formData.get('qualityGrade') as 'A' | 'B' | 'C',
      lengthIn,
      widthIn,
      thicknessCm: toRequiredSlabThicknessCm(formData.get('thicknessCm')),
      costCents: slabValueCents(lengthIn, widthIn, valuePerSqFt),
      ...(lotNumber ? { lotNumber } : {}),
      ...(bundleNumber ? { bundleNumber } : {}),
      ...(warehouseLocation ? { warehouseLocation } : {}),
      ...(notes ? { notes } : {}),
    },
  });

  if (error) throw new Error('Failed to create slab: ' + JSON.stringify(error));
  redirect(`/slabs/${data.id}`);
}

export async function updateSlabAction(slabId: string, formData: FormData) {
  const client = await getApiClientWithAuth();
  const lengthIn = toRequiredNumber(formData.get('lengthIn'));
  const widthIn = toRequiredNumber(formData.get('widthIn'));
  const valuePerSqFt = toRequiredNumber(formData.get('valuePerSqFt'));

  const { error } = await client.PATCH('/inventory/slabs/{slabId}', {
    params: { path: { slabId } },
    body: {
      stoneType: formData.get('stoneType') as string,
      finish: formData.get('finish') as 'polished' | 'honed' | 'brushed' | 'leathered' | 'sandblasted',
      qualityGrade: formData.get('qualityGrade') as 'A' | 'B' | 'C',
      lengthIn,
      widthIn,
      thicknessCm: toRequiredSlabThicknessCm(formData.get('thicknessCm')),
      costCents: slabValueCents(lengthIn, widthIn, valuePerSqFt),
      lotNumber: toOptionalNullableString(formData.get('lotNumber')),
      bundleNumber: toOptionalNullableString(formData.get('bundleNumber')),
      warehouseLocation: toOptionalNullableString(formData.get('warehouseLocation')),
      notes: toOptionalNullableString(formData.get('notes')),
    },
  });

  if (error) throw new Error('Failed to update slab: ' + JSON.stringify(error));
  revalidatePath(`/slabs/${slabId}`);
  redirect(`/slabs/${slabId}`);
}

export async function archiveSlabAction(slabId: string) {
  const client = await getApiClientWithAuth();
  const { error } = await client.DELETE('/inventory/slabs/{slabId}', {
    params: { path: { slabId } },
    body: {},
  });
  if (error) throw new Error('Failed to archive slab: ' + JSON.stringify(error));
  redirect('/slabs');
}

export async function uploadSlabImageAction(slabId: string, formData: FormData) {
  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('better-auth.session_token');
  const baseUrl = process.env.API_BASE_URL;
  if (!baseUrl) throw new Error('API_BASE_URL not set');
  const apiOrigin = new URL(baseUrl).origin;

  const uploadForm = new FormData();
  const file = formData.get('image');
  if (!file || typeof file === 'string') throw new Error('No image file');
  uploadForm.append('image', file);

  const headers: Record<string, string> = {};
  if (sessionCookie) headers['Cookie'] = `better-auth.session_token=${sessionCookie.value}`;

  const res = await fetch(`${apiOrigin}/api/v1/inventory/slabs/${slabId}/images`, {
    method: 'POST',
    headers,
    body: uploadForm,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to upload image: ${res.status} ${body}`);
  }
  revalidatePath(`/slabs/${slabId}`);
  revalidatePath('/slabs');
}

export async function deleteSlabImageAction(slabId: string, url: string) {
  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('better-auth.session_token');
  const baseUrl = process.env.API_BASE_URL;
  if (!baseUrl) throw new Error('API_BASE_URL not set');
  const apiOrigin = new URL(baseUrl).origin;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (sessionCookie) headers['Cookie'] = `better-auth.session_token=${sessionCookie.value}`;

  const res = await fetch(`${apiOrigin}/api/v1/inventory/slabs/${slabId}/images`, {
    method: 'DELETE',
    headers,
    body: JSON.stringify({ url }),
  });
  if (!res.ok) throw new Error('Failed to delete image');
  revalidatePath(`/slabs/${slabId}`);
  revalidatePath('/slabs');
}
