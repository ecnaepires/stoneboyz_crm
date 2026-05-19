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

const toOptionalNumber = (value: FormDataEntryValue | null) => {
  const stringValue = typeof value === 'string' ? value.trim() : '';
  return stringValue ? Number(stringValue) : undefined;
};

const toOptionalNullableNumber = (value: FormDataEntryValue | null) => {
  const stringValue = typeof value === 'string' ? value.trim() : '';
  return stringValue ? Number(stringValue) : null;
};

const toCents = (value: FormDataEntryValue | null) => Math.round(Number(value || 0) * 100);
const toBoolean = (value: FormDataEntryValue | null) => value === 'on';

export async function createPriceListAction(formData: FormData) {
  const client = await getApiClientWithAuth();
  const description = toOptionalString(formData.get('description'));
  const defaultPaymentTerms = toOptionalString(formData.get('defaultPaymentTerms'));
  const expirationDays = toOptionalNumber(formData.get('expirationDays'));

  const { data, error } = await client.POST('/price-lists', {
    body: {
      name: formData.get('name') as string,
      revision: Number(formData.get('revision') || 1),
      currencyCode: formData.get('currencyCode') as string,
      defaultTaxRateBps: Number(formData.get('defaultTaxRateBps') || 0),
      ...(description ? { description } : {}),
      ...(defaultPaymentTerms ? { defaultPaymentTerms } : {}),
      ...(expirationDays !== undefined ? { expirationDays } : {}),
    },
  });

  if (error) throw new Error('Failed to create price list: ' + JSON.stringify(error));
  redirect(`/price-lists/${data.id}`);
}

export async function updatePriceListAction(priceListId: string, formData: FormData) {
  const client = await getApiClientWithAuth();

  const { error } = await client.PATCH('/price-lists/{priceListId}', {
    params: { path: { priceListId } },
    body: {
      name: formData.get('name') as string,
      description: toOptionalNullableString(formData.get('description')),
      revision: Number(formData.get('revision') || 1),
      currencyCode: formData.get('currencyCode') as string,
      defaultTaxRateBps: Number(formData.get('defaultTaxRateBps') || 0),
      defaultPaymentTerms: toOptionalNullableString(formData.get('defaultPaymentTerms')),
      expirationDays: toOptionalNullableNumber(formData.get('expirationDays')),
    },
  });

  if (error) throw new Error('Failed to update price list: ' + JSON.stringify(error));
  revalidatePath(`/price-lists/${priceListId}`);
  redirect(`/price-lists/${priceListId}`);
}

export async function activatePriceListAction(priceListId: string) {
  const client = await getApiClientWithAuth();
  const { error } = await client.POST('/price-lists/{priceListId}/activate', {
    params: { path: { priceListId } },
    body: {},
  });
  if (error) throw new Error('Failed to activate price list: ' + JSON.stringify(error));
  revalidatePath(`/price-lists/${priceListId}`);
}

export async function archivePriceListAction(priceListId: string) {
  const client = await getApiClientWithAuth();
  const { error } = await client.POST('/price-lists/{priceListId}/archive', {
    params: { path: { priceListId } },
    body: {},
  });
  if (error) throw new Error('Failed to archive price list: ' + JSON.stringify(error));
  redirect('/price-lists');
}

export async function createPriceListItemAction(priceListId: string, formData: FormData) {
  const client = await getApiClientWithAuth();
  const description = toOptionalString(formData.get('description'));
  const { error } = await client.POST('/price-lists/{priceListId}/items', {
    params: { path: { priceListId } },
    body: {
      category: formData.get('category') as string,
      itemType: formData.get('itemType') as string,
      name: formData.get('name') as string,
      unit: formData.get('unit') as string,
      priceCents: toCents(formData.get('price')),
      sortOrder: Number(formData.get('sortOrder') || 0),
      taxable: toBoolean(formData.get('taxable')),
      allowDiscount: toBoolean(formData.get('allowDiscount')),
      editableOnQuote: toBoolean(formData.get('editableOnQuote')),
      hideOnQuote: toBoolean(formData.get('hideOnQuote')),
      ...(description ? { description } : {}),
    },
  });
  if (error) throw new Error('Failed to create item: ' + JSON.stringify(error));
  revalidatePath(`/price-lists/${priceListId}`);
}

export async function updatePriceListItemAction(priceListId: string, itemId: string, formData: FormData) {
  const client = await getApiClientWithAuth();
  const { error } = await client.PATCH('/price-lists/{priceListId}/items/{itemId}', {
    params: { path: { priceListId, itemId } },
    body: {
      sortOrder: Number(formData.get('sortOrder') || 0),
      priceCents: toCents(formData.get('price')),
    },
  });
  if (error) throw new Error('Failed to update item: ' + JSON.stringify(error));
  revalidatePath(`/price-lists/${priceListId}`);
}

export async function deletePriceListItemAction(priceListId: string, itemId: string) {
  const client = await getApiClientWithAuth();
  const { error } = await client.DELETE('/price-lists/{priceListId}/items/{itemId}', {
    params: { path: { priceListId, itemId } },
    body: {},
  });
  if (error) throw new Error('Failed to delete item: ' + JSON.stringify(error));
  revalidatePath(`/price-lists/${priceListId}`);
}
