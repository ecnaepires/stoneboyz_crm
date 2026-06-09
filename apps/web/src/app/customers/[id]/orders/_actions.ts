'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { components } from '@stoneboyz/api-client';
import { getApiClientWithAuth } from '@/lib/api';

type OrderPaymentMethod = components['schemas']['OrderPaymentMethod'];

const toOptionalString = (value: FormDataEntryValue | null) => {
  const stringValue = typeof value === 'string' ? value.trim() : '';
  return stringValue ? stringValue : undefined;
};

const toCents = (value: FormDataEntryValue | null) => {
  const numericValue = Number(value || 0);
  return Math.round(numericValue * 100);
};

export async function convertQuoteToOrderAction(customerId: string, quoteId: string, formData: FormData) {
  const client = await getApiClientWithAuth();

  const { data, error } = await client.POST('/customers/{customerId}/quotes/{quoteId}/convert', {
    params: { path: { customerId, quoteId } },
    body: {
      saleDate: formData.get('saleDate') as string,
    },
  });

  if (error) {
    throw new Error('Failed to convert quote to order: ' + JSON.stringify(error));
  }

  redirect(`/customers/${customerId}/orders/${data.id}`);
}

export async function addPaymentAction(customerId: string, orderId: string, formData: FormData) {
  const client = await getApiClientWithAuth();
  const referenceNumber = toOptionalString(formData.get('referenceNumber'));
  const notes = toOptionalString(formData.get('notes'));

  const { error } = await client.POST('/customers/{customerId}/orders/{orderId}/payments', {
    params: { path: { customerId, orderId } },
    body: {
      paymentDate: formData.get('paymentDate') as string,
      amountCents: toCents(formData.get('amount')),
      paymentMethod: formData.get('paymentMethod') as OrderPaymentMethod,
      ...(referenceNumber ? { referenceNumber } : {}),
      ...(notes ? { notes } : {}),
    },
  });

  if (error) {
    throw new Error('Failed to add payment: ' + JSON.stringify(error));
  }

  revalidatePath(`/customers/${customerId}/orders/${orderId}`);
}

export async function requestDepositAction(customerId: string, orderId: string, formData: FormData) {
  const client = await getApiClientWithAuth();

  const { error } = await client.POST('/customers/{customerId}/orders/{orderId}/deposit/request', {
    params: { path: { customerId, orderId } },
    body: {
      depositRequiredCents: toCents(formData.get('depositAmount')),
    },
  });

  if (error) {
    throw new Error('Failed to request deposit: ' + JSON.stringify(error));
  }

  revalidatePath(`/customers/${customerId}/orders/${orderId}`);
}

export async function voidPaymentAction(customerId: string, orderId: string, paymentId: string) {
  const client = await getApiClientWithAuth();

  const { error } = await client.DELETE('/customers/{customerId}/orders/{orderId}/payments/{paymentId}', {
    params: { path: { customerId, orderId, paymentId } },
    body: {},
  });

  if (error) {
    throw new Error('Failed to void payment: ' + JSON.stringify(error));
  }

  revalidatePath(`/customers/${customerId}/orders/${orderId}`);
}

export async function archiveOrderAction(customerId: string, orderId: string) {
  const client = await getApiClientWithAuth();

  const { error } = await client.POST('/customers/{customerId}/orders/{orderId}/archive', {
    params: { path: { customerId, orderId } },
    body: {},
  });

  if (error) {
    throw new Error('Failed to archive order: ' + JSON.stringify(error));
  }

  redirect(`/customers/${customerId}/orders`);
}
