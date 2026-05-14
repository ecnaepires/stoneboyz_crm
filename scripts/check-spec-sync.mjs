import { existsSync, readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');
const failures = [];

const customersSpec = read('docs/specs/modules/customers.md');
const eventCatalog = read('docs/specs/events/catalog.v1.yaml');
const openApi = read('docs/specs/api/openapi.yaml');
const dbInvariants = read('docs/specs/db/invariants.md');

const requiredDomainFiles = [
  'packages/domain/package.json',
  'packages/domain/tsconfig.json',
  'packages/domain/src/customers/customer.constants.ts',
  'packages/domain/src/customers/customer.types.ts'
];

for (const filePath of requiredDomainFiles) {
  if (!existsSync(filePath)) {
    failures.push(`missing domain scaffold file ${filePath}`);
  }
}

const requiredCustomerEvents = [
  'customer.created',
  'customer.updated',
  'customer.status_changed',
  'customer.archived',
  'customer.restored',
  'customer.contact_created',
  'customer.contact_updated',
  'customer.contact_archived',
  'customer.primary_contact_changed',
  'customer.billing_contact_changed',
  'customer.address_created',
  'customer.address_updated',
  'customer.address_archived',
  'customer.billing_address_changed',
  'customer.note_created',
  'customer.note_updated',
  'customer.note_archived'
];

for (const eventName of requiredCustomerEvents) {
  if (!customersSpec.includes(eventName)) {
    failures.push(`customers.md missing event ${eventName}`);
  }

  if (!eventCatalog.includes(`${eventName}:`)) {
    failures.push(`event catalog missing ${eventName}`);
  }
}

const requiredOpenApiSnippets = [
  '/customers:',
  '/customers/{customerId}:',
  'operationId: listCustomers',
  'operationId: createCustomer',
  'operationId: getCustomer',
  'operationId: updateCustomer',
  'operationId: archiveCustomer',
  'operationId: restoreCustomer',
  'operationId: listCustomerContacts',
  'operationId: createCustomerContact',
  'operationId: updateCustomerContact',
  'operationId: archiveCustomerContact',
  'CustomerKind:',
  'CustomerContact:',
  'CreateCustomerRequest:',
  'CreateCustomerContactRequest:',
  'UpdateCustomerContactRequest:',
  'UpdateCustomerRequest:',
  'ArchiveCustomerRequest:',
  'RestoreCustomerRequest:',
  'PaginatedCustomersResponse:'
];

for (const snippet of requiredOpenApiSnippets) {
  if (!openApi.includes(snippet)) {
    failures.push(`openapi.yaml missing ${snippet}`);
  }
}

if (!customersSpec.includes('stored as `deleted_at` in DB')) {
  failures.push('customers.md must document archivedAt -> deleted_at mapping');
}

if (!dbInvariants.includes('Database schema still uses `deleted_at` consistently.')) {
  failures.push('db invariants must document archive -> deleted_at mapping');
}

const customerConstants = existsSync('packages/domain/src/customers/customer.constants.ts')
  ? read('packages/domain/src/customers/customer.constants.ts')
  : '';

for (const token of [
  'CUSTOMER_KIND_VALUES',
  'CUSTOMER_STATUS_VALUES',
  'CUSTOMER_TYPE_VALUES',
  'CONTACT_CHANNEL_VALUES',
  'CUSTOMER_ADDRESS_TYPE_VALUES'
]) {
  if (!customerConstants.includes(token)) {
    failures.push(`customer.constants.ts missing ${token}`);
  }
}

if (failures.length > 0) {
  console.error('Spec sync check failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('Spec sync check passed.');
