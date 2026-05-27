import { z } from 'zod';
import {
  CONTACT_CHANNEL_VALUES,
  CUSTOMER_ADDRESS_TYPE_VALUES,
  CUSTOMER_KIND_VALUES,
  CUSTOMER_SORT_BY_VALUES,
  CUSTOMER_SOURCE_VALUES,
  CUSTOMER_STATUS_VALUES,
  CUSTOMER_TYPE_VALUES,
  SORT_DIRECTION_VALUES
} from './customer.constants.js';

const customerKindSchema = z.enum(CUSTOMER_KIND_VALUES);
const customerStatusSchema = z.enum(CUSTOMER_STATUS_VALUES);
const customerTypeSchema = z.enum(CUSTOMER_TYPE_VALUES);
const customerSourceSchema = z.enum(CUSTOMER_SOURCE_VALUES);
const contactChannelSchema = z.enum(CONTACT_CHANNEL_VALUES);
export const customerAddressTypeSchema = z.enum(CUSTOMER_ADDRESS_TYPE_VALUES);
const customerSortBySchema = z.enum(CUSTOMER_SORT_BY_VALUES);
const sortDirectionSchema = z.enum(SORT_DIRECTION_VALUES);
const actorUserIdSchema = z.string().uuid().optional();

export const createCustomerSchema = z.object({
  actorUserId: actorUserIdSchema,
  customerKind: customerKindSchema,
  name: z.string().min(1),
  companyName: z.string().min(1).optional(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  displayName: z.string().min(1).optional(),
  status: customerStatusSchema,
  type: customerTypeSchema,
  ownerUserId: z.string().uuid(),
  taxId: z.string().min(1).optional(),
  website: z.string().url().optional(),
  industry: z.string().min(1).optional(),
  companySize: z.string().min(1).optional(),
  source: customerSourceSchema.optional(),
  tags: z.array(z.string().min(1)).optional(),
  notesSummary: z.string().min(1).optional(),
  phone: z.string().min(1).optional(),
  whatsappPhone: z.string().min(1).optional(),
  billingEmail: z.string().email().optional()
}).superRefine((input, ctx) => {
  if (input.customerKind === 'company' && input.companyName === undefined) {
    ctx.addIssue({
      code: 'custom',
      message: 'companyName is required when customerKind is company',
      path: ['companyName']
    });
  }

  if (input.customerKind === 'person' && input.firstName === undefined) {
    ctx.addIssue({
      code: 'custom',
      message: 'firstName is required when customerKind is person',
      path: ['firstName']
    });
  }
});

export const updateCustomerSchema = z.object({
  actorUserId: actorUserIdSchema,
  customerKind: customerKindSchema.optional(),
  name: z.string().min(1).optional(),
  companyName: z.string().min(1).nullable().optional(),
  firstName: z.string().min(1).nullable().optional(),
  lastName: z.string().min(1).nullable().optional(),
  displayName: z.string().min(1).nullable().optional(),
  status: customerStatusSchema.optional(),
  type: customerTypeSchema.optional(),
  ownerUserId: z.string().uuid().optional(),
  taxId: z.string().min(1).nullable().optional(),
  website: z.string().url().nullable().optional(),
  industry: z.string().min(1).nullable().optional(),
  companySize: z.string().min(1).nullable().optional(),
  source: customerSourceSchema.nullable().optional(),
  priceListId: z.string().uuid().nullable().optional(),
  tags: z.array(z.string().min(1)).optional(),
  notesSummary: z.string().min(1).nullable().optional(),
  phone: z.string().min(1).nullable().optional(),
  whatsappPhone: z.string().min(1).nullable().optional(),
  billingEmail: z.string().email().nullable().optional()
}).refine((input) => Object.keys(input).length > 0, {
  message: 'At least one field is required',
  path: []
});

export const archiveCustomerSchema = z.object({
  actorUserId: actorUserIdSchema,
  archiveReason: z.string().min(1).optional()
});

export const restoreCustomerSchema = z.object({
  actorUserId: actorUserIdSchema
});

export const createCustomerContactSchema = z.object({
  actorUserId: actorUserIdSchema,
  firstName: z.string().min(1),
  lastName: z.string().min(1).optional(),
  jobTitle: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(1).optional(),
  whatsappPhone: z.string().min(1).optional(),
  isPrimary: z.boolean().default(false),
  isBilling: z.boolean().default(false),
  preferredChannel: contactChannelSchema.default('none')
});

export const updateCustomerContactSchema = z.object({
  actorUserId: actorUserIdSchema,
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).nullable().optional(),
  jobTitle: z.string().min(1).nullable().optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().min(1).nullable().optional(),
  whatsappPhone: z.string().min(1).nullable().optional(),
  isPrimary: z.boolean().optional(),
  isBilling: z.boolean().optional(),
  preferredChannel: contactChannelSchema.optional()
}).refine((input) => Object.keys(input).length > 0, {
  message: 'At least one field is required',
  path: []
});

export const archiveCustomerContactSchema = z.object({});

export const createCustomerAddressSchema = z.object({
  type: customerAddressTypeSchema,
  line1: z.string().min(1),
  line2: z.string().min(1).optional(),
  city: z.string().min(1),
  region: z.string().min(1).optional(),
  postalCode: z.string().min(1).optional(),
  country: z.string().min(1),
  isPrimary: z.boolean().default(false),
  isBilling: z.boolean().default(false)
});

export const updateCustomerAddressSchema = z.object({
  type: customerAddressTypeSchema.optional(),
  line1: z.string().min(1).optional(),
  line2: z.string().min(1).nullable().optional(),
  city: z.string().min(1).optional(),
  region: z.string().min(1).nullable().optional(),
  postalCode: z.string().min(1).nullable().optional(),
  country: z.string().min(1).optional(),
  isPrimary: z.boolean().optional(),
  isBilling: z.boolean().optional()
}).refine((input) => Object.keys(input).length > 0, {
  message: 'At least one field is required',
  path: []
});

export const archiveCustomerAddressSchema = z.object({});

export const createCustomerNoteSchema = z.object({
  body: z.string().min(1)
});

export const updateCustomerNoteSchema = z.object({
  body: z.string().min(1)
});

export const archiveCustomerNoteSchema = z.object({});

export const listCustomersSchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.number().int().min(1).max(100).default(25),
  search: z.string().min(1).optional(),
  status: customerStatusSchema.optional(),
  type: customerTypeSchema.optional(),
  ownerUserId: z.string().uuid().optional(),
  customerKind: customerKindSchema.optional(),
  tag: z.preprocess(
    (v) => (v === undefined ? undefined : Array.isArray(v) ? v : [v]),
    z.array(z.string().min(1)).optional()
  ),
  industry: z.string().min(1).optional(),
  source: customerSourceSchema.optional(),
  priceListId: z.string().uuid().optional(),
  createdAtFrom: z.coerce.date().optional(),
  createdAtTo: z.coerce.date().optional(),
  sortBy: customerSortBySchema.default('updatedAt'),
  sortDirection: sortDirectionSchema.default('desc'),
  includeArchived: z.boolean().default(false)
});
