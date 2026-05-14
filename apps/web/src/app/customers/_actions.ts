'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getApiClient } from '@/lib/api';
import { getActorUserId } from '@/lib/actor';

export async function createCustomerAction(formData: FormData) {
  const client = getApiClient();
  const actorUserId = await getActorUserId();
  const ownerUserId = actorUserId;

  const customerKind = formData.get('customerKind') as string;
  const name = formData.get('name') as string;
  const status = formData.get('status') as string;
  const type = formData.get('type') as string;
  const industry = formData.get('industry') as string | null;
  const source = formData.get('source') as string | null;
  const taxId = formData.get('taxId') as string | null;
  const companyName =
    customerKind === 'company' ? (formData.get('companyName') as string | null) : undefined;
  const firstName =
    customerKind === 'person' ? (formData.get('firstName') as string | null) : undefined;
  const lastName =
    customerKind === 'person' ? (formData.get('lastName') as string | null) : undefined;

  const body = {
    actorUserId,
    ownerUserId,
    customerKind: customerKind as 'company' | 'person',
    name,
    status: status as 'lead' | 'qualified' | 'active' | 'inactive' | 'churned',
    type: type as 'prospect' | 'customer' | 'partner' | 'vendor',
    ...(companyName ? { companyName } : {}),
    ...(firstName ? { firstName } : {}),
    ...(lastName ? { lastName } : {}),
    ...(industry ? { industry } : {}),
    ...(source ? { source } : {}),
    ...(taxId ? { taxId } : {}),
  };

  const { data, error } = await client.POST('/customers', { body });

  if (error) {
    throw new Error('Failed to create customer: ' + JSON.stringify(error));
  }

  redirect(`/customers/${data.id}`);
}

export async function archiveCustomerAction(customerId: string) {
  const client = getApiClient();
  const actorUserId = await getActorUserId();

  const { error } = await client.POST('/customers/{customerId}/archive', {
    params: { path: { customerId } },
    body: { actorUserId },
  });

  if (error) {
    throw new Error('Failed to archive customer');
  }

  redirect('/customers');
}

export async function restoreCustomerAction(customerId: string) {
  const client = getApiClient();
  const actorUserId = await getActorUserId();

  const { error } = await client.POST('/customers/{customerId}/restore', {
    params: { path: { customerId } },
    body: { actorUserId },
  });

  if (error) {
    throw new Error('Failed to restore customer');
  }

  redirect(`/customers/${customerId}`);
}

export async function restoreFromArchivedListAction(customerId: string) {
  const client = getApiClient();
  const actorUserId = await getActorUserId();
  const { error } = await client.POST('/customers/{customerId}/restore', {
    params: { path: { customerId } },
    body: { actorUserId },
  });
  if (error) throw new Error('Failed to restore customer');
  redirect('/customers/archived');
}

export async function updateCustomerAction(customerId: string, formData: FormData) {
  const client = getApiClient();
  const actorUserId = await getActorUserId();

  const customerKind = formData.get('customerKind') as string;
  const name = formData.get('name') as string;
  const status = formData.get('status') as string;
  const type = formData.get('type') as string;
  const industry = formData.get('industry') as string | null;
  const source = formData.get('source') as string | null;
  const taxId = formData.get('taxId') as string | null;
  const companyName =
    customerKind === 'company' ? (formData.get('companyName') as string | null) : undefined;
  const firstName =
    customerKind === 'person' ? (formData.get('firstName') as string | null) : undefined;
  const lastName =
    customerKind === 'person' ? (formData.get('lastName') as string | null) : undefined;

  const { error } = await client.PATCH('/customers/{customerId}', {
    params: { path: { customerId } },
    body: {
      actorUserId,
      customerKind: customerKind as 'company' | 'person',
      name,
      status: status as 'lead' | 'qualified' | 'active' | 'inactive' | 'churned',
      type: type as 'prospect' | 'customer' | 'partner' | 'vendor',
      ...(companyName ? { companyName } : {}),
      ...(firstName ? { firstName } : {}),
      ...(lastName ? { lastName } : {}),
      ...(industry ? { industry } : {}),
      ...(source ? { source } : {}),
      ...(taxId ? { taxId } : {}),
    },
  });

  if (error) {
    throw new Error('Failed to update customer: ' + JSON.stringify(error));
  }

  revalidatePath(`/customers/${customerId}`);
}

export async function addNoteAction(customerId: string, formData: FormData) {
  const client = getApiClient();
  const actorUserId = await getActorUserId();

  const { error } = await client.POST('/customers/{customerId}/notes', {
    params: { path: { customerId } },
    body: { actorUserId, body: formData.get('body') as string },
  });

  if (error) {
    throw new Error('Failed to add note: ' + JSON.stringify(error));
  }

  revalidatePath(`/customers/${customerId}`);
}

export async function deleteNoteAction(customerId: string, noteId: string) {
  const client = getApiClient();
  const actorUserId = await getActorUserId();

  const { error } = await client.DELETE('/customers/{customerId}/notes/{noteId}', {
    params: { path: { customerId, noteId } },
    body: { actorUserId },
  });

  if (error) {
    throw new Error('Failed to delete note: ' + JSON.stringify(error));
  }

  revalidatePath(`/customers/${customerId}`);
}

export async function addContactAction(customerId: string, formData: FormData) {
  const client = getApiClient();
  const actorUserId = await getActorUserId();

  const firstName = formData.get('firstName') as string;
  const lastName = formData.get('lastName') as string | null;
  const email = formData.get('email') as string | null;
  const phone = formData.get('phone') as string | null;
  const jobTitle = formData.get('jobTitle') as string | null;

  const { error } = await client.POST('/customers/{customerId}/contacts', {
    params: { path: { customerId } },
    body: {
      actorUserId,
      firstName,
      isPrimary: false,
      isBilling: false,
      ...(lastName ? { lastName } : {}),
      ...(email ? { email } : {}),
      ...(phone ? { phone } : {}),
      ...(jobTitle ? { jobTitle } : {}),
    },
  });

  if (error) {
    throw new Error('Failed to add contact: ' + JSON.stringify(error));
  }

  revalidatePath(`/customers/${customerId}`);
}

export async function deleteContactAction(customerId: string, contactId: string) {
  const client = getApiClient();
  const actorUserId = await getActorUserId();

  const { error } = await client.DELETE('/customers/{customerId}/contacts/{contactId}', {
    params: { path: { customerId, contactId } },
    body: { actorUserId },
  });

  if (error) {
    throw new Error('Failed to delete contact: ' + JSON.stringify(error));
  }

  revalidatePath(`/customers/${customerId}`);
}

export async function makePrimaryContactAction(customerId: string, contactId: string) {
  const client = getApiClient();
  const actorUserId = await getActorUserId();

  const { error } = await client.POST('/customers/{customerId}/contacts/{contactId}/make-primary', {
    params: { path: { customerId, contactId } },
    body: { actorUserId },
  });

  if (error) {
    throw new Error('Failed to make contact primary: ' + JSON.stringify(error));
  }

  revalidatePath(`/customers/${customerId}`);
}

export async function makeBillingContactAction(customerId: string, contactId: string) {
  const client = getApiClient();
  const actorUserId = await getActorUserId();

  const { error } = await client.POST('/customers/{customerId}/contacts/{contactId}/make-billing', {
    params: { path: { customerId, contactId } },
    body: { actorUserId },
  });

  if (error) {
    throw new Error('Failed to make contact billing: ' + JSON.stringify(error));
  }

  revalidatePath(`/customers/${customerId}`);
}

export async function addAddressAction(customerId: string, formData: FormData) {
  const client = getApiClient();
  const actorUserId = await getActorUserId();

  const type = formData.get('type') as string;
  const line1 = formData.get('line1') as string;
  const line2 = formData.get('line2') as string | null;
  const city = formData.get('city') as string;
  const region = formData.get('region') as string | null;
  const postalCode = formData.get('postalCode') as string | null;
  const country = formData.get('country') as string;

  const { error } = await client.POST('/customers/{customerId}/addresses', {
    params: { path: { customerId } },
    body: {
      actorUserId,
      type: type as 'billing' | 'shipping' | 'other',
      line1,
      city,
      country,
      isPrimary: false,
      isBilling: false,
      ...(line2 ? { line2 } : {}),
      ...(region ? { region } : {}),
      ...(postalCode ? { postalCode } : {}),
    },
  });

  if (error) {
    throw new Error('Failed to add address: ' + JSON.stringify(error));
  }

  revalidatePath(`/customers/${customerId}`);
}

export async function deleteAddressAction(customerId: string, addressId: string) {
  const client = getApiClient();
  const actorUserId = await getActorUserId();

  const { error } = await client.DELETE('/customers/{customerId}/addresses/{addressId}', {
    params: { path: { customerId, addressId } },
    body: { actorUserId },
  });

  if (error) {
    throw new Error('Failed to delete address: ' + JSON.stringify(error));
  }

  revalidatePath(`/customers/${customerId}`);
}
