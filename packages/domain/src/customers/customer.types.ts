import type {
  ContactChannel,
  CustomerAddressType,
  CustomerKind,
  CustomerSortBy,
  CustomerSource,
  CustomerStatus,
  CustomerType,
  SortDirection
} from './customer.constants.js';

export interface Customer {
  id: string;
  customerKind: CustomerKind;
  name: string;
  companyName: string | null;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  status: CustomerStatus;
  type: CustomerType;
  ownerUserId: string;
  primaryContactId: string | null;
  billingContactId: string | null;
  billingAddressId: string | null;
  taxId: string | null;
  website: string | null;
  industry: string | null;
  companySize: string | null;
  source: CustomerSource | null;
  priceListId: string | null;
  tags: string[];
  notesSummary: string | null;
  phone: string | null;
  whatsappPhone: string | null;
  billingEmail: string | null;
  archiveReason: string | null;
  archivedAt: string | null;
  archivedByUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerContact {
  id: string;
  customerId: string;
  firstName: string;
  lastName: string | null;
  jobTitle: string | null;
  email: string | null;
  phone: string | null;
  whatsappPhone: string | null;
  isPrimary: boolean;
  isBilling: boolean;
  preferredChannel: ContactChannel;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export interface CreateCustomerContactInput {
  actorUserId: string;
  firstName: string;
  lastName?: string | undefined;
  jobTitle?: string | undefined;
  email?: string | undefined;
  phone?: string | undefined;
  whatsappPhone?: string | undefined;
  isPrimary?: boolean | undefined;
  isBilling?: boolean | undefined;
  preferredChannel?: ContactChannel | undefined;
}

export interface UpdateCustomerContactInput {
  actorUserId: string;
  firstName?: string | undefined;
  lastName?: string | null | undefined;
  jobTitle?: string | null | undefined;
  email?: string | null | undefined;
  phone?: string | null | undefined;
  whatsappPhone?: string | null | undefined;
  isPrimary?: boolean | undefined;
  isBilling?: boolean | undefined;
  preferredChannel?: ContactChannel | undefined;
}

export interface ArchiveCustomerContactInput {
  actorUserId: string;
}

export interface CreateCustomerAddressInput {
  actorUserId: string;
  type: CustomerAddressType;
  line1: string;
  line2?: string | undefined;
  city: string;
  region?: string | undefined;
  postalCode?: string | undefined;
  country: string;
  isPrimary?: boolean | undefined;
  isBilling?: boolean | undefined;
}

export interface UpdateCustomerAddressInput {
  actorUserId: string;
  type?: CustomerAddressType | undefined;
  line1?: string | undefined;
  line2?: string | null | undefined;
  city?: string | undefined;
  region?: string | null | undefined;
  postalCode?: string | null | undefined;
  country?: string | undefined;
  isPrimary?: boolean | undefined;
  isBilling?: boolean | undefined;
}

export interface ArchiveCustomerAddressInput {
  actorUserId: string;
}

export interface CustomerAddress {
  id: string;
  customerId: string;
  type: CustomerAddressType;
  line1: string;
  line2: string | null;
  city: string;
  region: string | null;
  postalCode: string | null;
  country: string;
  isPrimary: boolean;
  isBilling: boolean;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export interface CustomerNote {
  id: string;
  customerId: string;
  authorUserId: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export interface CreateCustomerNoteInput {
  actorUserId: string;
  body: string;
}

export interface UpdateCustomerNoteInput {
  body: string;
}

export interface ArchiveCustomerNoteInput {
  actorUserId: string;
}

export interface CreateCustomerInput {
  actorUserId: string;
  customerKind: CustomerKind;
  name: string;
  companyName?: string | undefined;
  firstName?: string | undefined;
  lastName?: string | undefined;
  displayName?: string | undefined;
  status: CustomerStatus;
  type: CustomerType;
  ownerUserId: string;
  taxId?: string | undefined;
  website?: string | undefined;
  industry?: string | undefined;
  companySize?: string | undefined;
  source?: CustomerSource | undefined;
  priceListId?: string | undefined;
  tags?: string[] | undefined;
  notesSummary?: string | undefined;
  phone?: string | undefined;
  whatsappPhone?: string | undefined;
  billingEmail?: string | undefined;
}

export interface UpdateCustomerInput {
  actorUserId: string;
  customerKind?: CustomerKind | undefined;
  name?: string | undefined;
  companyName?: string | null | undefined;
  firstName?: string | null | undefined;
  lastName?: string | null | undefined;
  displayName?: string | null | undefined;
  status?: CustomerStatus | undefined;
  type?: CustomerType | undefined;
  ownerUserId?: string | undefined;
  taxId?: string | null | undefined;
  website?: string | null | undefined;
  industry?: string | null | undefined;
  companySize?: string | null | undefined;
  source?: CustomerSource | null | undefined;
  priceListId?: string | null | undefined;
  tags?: string[] | undefined;
  notesSummary?: string | null | undefined;
  phone?: string | null | undefined;
  whatsappPhone?: string | null | undefined;
  billingEmail?: string | null | undefined;
}

export interface ArchiveCustomerInput {
  actorUserId: string;
  archiveReason?: string | undefined;
}

export interface RestoreCustomerInput {
  actorUserId: string;
}

export interface ListCustomersInput {
  cursor?: string | undefined;
  limit?: number | undefined;
  search?: string | undefined;
  status?: CustomerStatus | undefined;
  type?: CustomerType | undefined;
  ownerUserId?: string | undefined;
  customerKind?: CustomerKind | undefined;
  tag?: string[] | undefined;
  industry?: string | undefined;
  source?: CustomerSource | undefined;
  createdAtFrom?: Date | undefined;
  createdAtTo?: Date | undefined;
  sortBy?: CustomerSortBy | undefined;
  sortDirection?: SortDirection | undefined;
  includeArchived?: boolean | undefined;
}
