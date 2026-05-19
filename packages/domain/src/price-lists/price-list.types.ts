import type { PRICE_LIST_STATUS_VALUES } from './price-list.constants.js';

export type PriceListStatus = typeof PRICE_LIST_STATUS_VALUES[number];

export interface PriceList {
  id: string;
  name: string;
  description: string | null;
  status: PriceListStatus;
  revision: number;
  currencyCode: string;
  defaultTaxRateBps: number;
  defaultPaymentTerms: string | null;
  expirationDays: number | null;
  createdByUserId: string;
  archivedAt: string | null;
  archivedByUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PriceListItem {
  id: string;
  priceListId: string;
  category: string;
  itemType: string;
  name: string;
  description: string | null;
  unit: string;
  priceCents: number;
  sortOrder: number;
  taxable: boolean;
  allowDiscount: boolean;
  editableOnQuote: boolean;
  hideOnQuote: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PriceListWithItems extends PriceList {
  items: PriceListItem[];
}

export interface CreatePriceListInput {
  actorUserId: string;
  name: string;
  description?: string | undefined;
  revision?: number | undefined;
  currencyCode?: string | undefined;
  defaultTaxRateBps?: number | undefined;
  defaultPaymentTerms?: string | undefined;
  expirationDays?: number | undefined;
}

export interface UpdatePriceListInput {
  actorUserId: string;
  name?: string | undefined;
  description?: string | null | undefined;
  revision?: number | undefined;
  currencyCode?: string | undefined;
  defaultTaxRateBps?: number | undefined;
  defaultPaymentTerms?: string | null | undefined;
  expirationDays?: number | null | undefined;
}

export interface PriceListActorInput {
  actorUserId: string;
}

export interface ListPriceListsInput {
  cursor?: string | undefined;
  limit?: number | undefined;
  status?: PriceListStatus | undefined;
  search?: string | undefined;
  includeArchived?: boolean | undefined;
}

export interface CreatePriceListItemInput {
  actorUserId: string;
  category: string;
  itemType: string;
  name: string;
  description?: string | undefined;
  unit: string;
  priceCents: number;
  sortOrder?: number | undefined;
  taxable?: boolean | undefined;
  allowDiscount?: boolean | undefined;
  editableOnQuote?: boolean | undefined;
  hideOnQuote?: boolean | undefined;
}

export interface UpdatePriceListItemInput {
  actorUserId: string;
  category?: string | undefined;
  itemType?: string | undefined;
  name?: string | undefined;
  description?: string | null | undefined;
  unit?: string | undefined;
  priceCents?: number | undefined;
  sortOrder?: number | undefined;
  taxable?: boolean | undefined;
  allowDiscount?: boolean | undefined;
  editableOnQuote?: boolean | undefined;
  hideOnQuote?: boolean | undefined;
}
