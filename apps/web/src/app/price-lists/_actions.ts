'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { PriceListChargeMethod, PriceListItemGroup, PriceListMeasurementBasis } from '@stoneboyz/domain';
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
const formBoolean = (formData: FormData, fieldName: string, fallback: boolean) =>
  formData.has(fieldName) ? toBoolean(formData.get(fieldName)) : fallback;

type ItemGroup = PriceListItemGroup;
type ChargeMethod = PriceListChargeMethod;
type MeasurementBasis = PriceListMeasurementBasis;

const ITEM_GROUPS = ['material', 'fabrication', 'edge', 'sink', 'faucet_hole', 'splash', 'admin'] as const satisfies readonly ItemGroup[];
const CHARGE_METHODS = ['square_foot', 'linear_foot', 'each'] as const satisfies readonly ChargeMethod[];
const MEASUREMENT_BASES = [
  'countertop_sqft',
  'backsplash_sqft',
  'combined_sqft',
  'finished_edge_linft',
  'splash_sqft',
  'sink_count',
  'faucet_hole_count',
  'each',
] as const satisfies readonly MeasurementBasis[];

const oneOf = <T extends readonly string[]>(values: T, value: FormDataEntryValue | null, fallback: T[number]): T[number] => {
  const stringValue = typeof value === 'string' ? value : '';
  return values.includes(stringValue) ? stringValue as T[number] : fallback;
};

const unitForChargeMethod = (chargeMethod: string) => {
  if (chargeMethod === 'linear_foot') return 'linft';
  if (chargeMethod === 'each') return 'ea';
  return 'sqft';
};

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
  const itemGroup: ItemGroup = oneOf(ITEM_GROUPS, formData.get('itemGroup'), 'material');
  const chargeMethod: ChargeMethod = oneOf(CHARGE_METHODS, formData.get('chargeMethod'), 'square_foot');
  const measurementBasis: MeasurementBasis = oneOf(MEASUREMENT_BASES, formData.get('measurementBasis'), 'combined_sqft');
  const category = toOptionalString(formData.get('category')) ?? 'admin_item';
  const itemType = toOptionalString(formData.get('itemType')) ?? itemGroup;
  const { error } = await client.POST('/price-lists/{priceListId}/items', {
    params: { path: { priceListId } },
    body: {
      itemGroup,
      category,
      itemType,
      name: formData.get('name') as string,
      chargeMethod,
      measurementBasis,
      unit: unitForChargeMethod(chargeMethod),
      priceCents: toCents(formData.get('price')),
      sortOrder: Number(formData.get('sortOrder') || 0),
      taxable: formBoolean(formData, 'taxable', true),
      allowDiscount: formBoolean(formData, 'allowDiscount', true),
      editableOnQuote: formBoolean(formData, 'editableOnQuote', true),
      hideOnQuote: formBoolean(formData, 'hideOnQuote', false),
      ...(description ? { description } : {}),
    },
  });
  if (error) throw new Error('Failed to create item: ' + JSON.stringify(error));
  revalidatePath(`/price-lists/${priceListId}`);
}

export async function updatePriceListItemAction(priceListId: string, itemId: string, formData: FormData) {
  const client = await getApiClientWithAuth();
  const name = toOptionalString(formData.get('name'));
  const itemGroup: ItemGroup | undefined = formData.has('itemGroup')
    ? oneOf(ITEM_GROUPS, formData.get('itemGroup'), 'material')
    : undefined;
  const category = toOptionalString(formData.get('category'));
  const chargeMethod: ChargeMethod | undefined = formData.has('chargeMethod')
    ? oneOf(CHARGE_METHODS, formData.get('chargeMethod'), 'square_foot')
    : undefined;
  const measurementBasis: MeasurementBasis | undefined = formData.has('measurementBasis')
    ? oneOf(MEASUREMENT_BASES, formData.get('measurementBasis'), 'combined_sqft')
    : undefined;
  const { error } = await client.PATCH('/price-lists/{priceListId}/items/{itemId}', {
    params: { path: { priceListId, itemId } },
    body: {
      ...(name ? { name } : {}),
      ...(itemGroup ? { itemGroup, itemType: itemGroup } : {}),
      ...(category ? { category } : {}),
      ...(chargeMethod ? { chargeMethod } : {}),
      ...(measurementBasis ? { measurementBasis } : {}),
      ...(chargeMethod ? { unit: unitForChargeMethod(chargeMethod) } : {}),
      sortOrder: Number(formData.get('sortOrder') || 0),
      priceCents: toCents(formData.get('price')),
      hideOnQuote: toBoolean(formData.get('hideOnQuote')),
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
