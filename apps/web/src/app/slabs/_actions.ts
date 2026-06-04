'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getApiClientWithAuth } from '@/lib/api';
import { buildDamageMarkPayload } from './damage-mark-payload';

const toOptionalString = (value: FormDataEntryValue | null) => {
  const stringValue = typeof value === 'string' ? value.trim() : '';
  return stringValue ? stringValue : undefined;
};

const toOptionalNullableStringOrUndefined = (value: FormDataEntryValue | null) => {
  const stringValue = typeof value === 'string' ? value.trim() : '';
  return stringValue ? stringValue : undefined;
};

const toOptionalNullableString = (value: FormDataEntryValue | null) => {
  const stringValue = typeof value === 'string' ? value.trim() : '';
  return stringValue ? stringValue : null;
};

const toRequiredNumber = (value: FormDataEntryValue | null) => parseFloat(String(value ?? '0'));
const toCents = (value: FormDataEntryValue | null) => Math.round(parseFloat(String(value ?? '0')) * 100);

export async function createSlabAction(formData: FormData) {
  const client = await getApiClientWithAuth();
  const lotNumber = toOptionalString(formData.get('lotNumber'));
  const bundleNumber = toOptionalString(formData.get('bundleNumber'));
  const warehouseLocation = toOptionalString(formData.get('warehouseLocation'));
  const notes = toOptionalString(formData.get('notes'));
  const materialColorId = toOptionalNullableStringOrUndefined(formData.get('materialColorId'));
  const storageLocationId = toOptionalNullableStringOrUndefined(formData.get('storageLocationId'));
  const inventoryReceiptId = toOptionalNullableStringOrUndefined(formData.get('inventoryReceiptId'));
  const tagCode = toOptionalString(formData.get('tagCode'));
  const holdReason = toOptionalString(formData.get('holdReason'));

  const { data, error } = await client.POST('/inventory/slabs', {
    body: {
      kind: (formData.get('kind') as string) || 'full_slab',
      availability: (formData.get('availability') as string) || 'available',
      ownership: (formData.get('ownership') as string) || 'shop_owned',
      condition: (formData.get('condition') as string) || 'good',
      stoneType: formData.get('stoneType') as string,
      finish: formData.get('finish') as 'polished' | 'honed' | 'brushed' | 'leathered' | 'sandblasted',
      qualityGrade: formData.get('qualityGrade') as 'A' | 'B' | 'C',
      lengthIn: toRequiredNumber(formData.get('lengthIn')),
      widthIn: toRequiredNumber(formData.get('widthIn')),
      thicknessCm: toRequiredNumber(formData.get('thicknessCm')),
      costCents: toCents(formData.get('cost')),
      ...(lotNumber ? { lotNumber } : {}),
      ...(bundleNumber ? { bundleNumber } : {}),
      ...(warehouseLocation ? { warehouseLocation } : {}),
      ...(materialColorId ? { materialColorId } : {}),
      ...(storageLocationId ? { storageLocationId } : {}),
      ...(inventoryReceiptId ? { inventoryReceiptId } : {}),
      ...(tagCode ? { tagCode } : {}),
      ...(holdReason ? { holdReason } : {}),
      ...(notes ? { notes } : {}),
    } as any,
  });

  if (error) throw new Error('Failed to create slab: ' + JSON.stringify(error));
  redirect(`/slabs/${data.id}`);
}

export async function updateSlabAction(slabId: string, formData: FormData) {
  const client = await getApiClientWithAuth();

  const { error } = await client.PATCH('/inventory/slabs/{slabId}', {
    params: { path: { slabId } },
    body: {
      stoneType: formData.get('stoneType') as string,
      finish: formData.get('finish') as 'polished' | 'honed' | 'brushed' | 'leathered' | 'sandblasted',
      qualityGrade: formData.get('qualityGrade') as 'A' | 'B' | 'C',
      lengthIn: toRequiredNumber(formData.get('lengthIn')),
      widthIn: toRequiredNumber(formData.get('widthIn')),
      thicknessCm: toRequiredNumber(formData.get('thicknessCm')),
      costCents: toCents(formData.get('cost')),
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
  if (!res.ok) throw new Error('Failed to upload image');
  revalidatePath(`/slabs/${slabId}`);
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
}

export async function createDamageMarkAction(slabId: string, formData: FormData) {
  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('better-auth.session_token');
  const baseUrl = process.env.API_BASE_URL;
  if (!baseUrl) throw new Error('API_BASE_URL not set');
  const apiOrigin = new URL(baseUrl).origin;
  const payload = buildDamageMarkPayload(formData);

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (sessionCookie) headers['Cookie'] = `better-auth.session_token=${sessionCookie.value}`;

  const res = await fetch(`${apiOrigin}/api/v1/inventory/slabs/${slabId}/damage-marks`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error('Failed to add damage mark');
  revalidatePath(`/slabs/${slabId}`);
}
