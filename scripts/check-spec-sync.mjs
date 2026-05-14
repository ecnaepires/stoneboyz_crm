import { existsSync, readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');
const failures = [];

const customersSpec = read('docs/specs/modules/customers.md');
const projectsSpec = read('docs/specs/modules/projects.md');
const quotesSpec = read('docs/specs/modules/quotes.md');
const eventCatalog = read('docs/specs/events/catalog.v1.yaml');
const openApi = read('docs/specs/api/openapi.yaml');
const dbInvariants = read('docs/specs/db/invariants.md');

const requiredDomainFiles = [
  'packages/domain/package.json',
  'packages/domain/tsconfig.json',
  'packages/domain/src/customers/customer.constants.ts',
  'packages/domain/src/customers/customer.types.ts',
  'packages/domain/src/projects/project.constants.ts',
  'packages/domain/src/projects/project.types.ts',
  'packages/domain/src/quotes/quote.types.ts',
  'packages/domain/src/quotes/quote.schemas.ts'
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

const requiredProjectEvents = [
  'project.created',
  'project.updated',
  'project.archived',
  'project.status_changed'
];

const requiredQuoteEvents = [
  'quote.created',
  'quote.updated',
  'quote.sent',
  'quote.accepted',
  'quote.rejected',
  'quote.archived',
  'quote.line_item_added',
  'quote.line_item_updated',
  'quote.line_item_removed'
];

const requireSnippet = (source, label, snippet) => {
  if (!source.includes(snippet)) {
    failures.push(`${label} missing ${snippet}`);
  }
};

for (const eventName of requiredCustomerEvents) {
  requireSnippet(customersSpec, 'customers.md', eventName);
  requireSnippet(eventCatalog, 'event catalog', `${eventName}:`);
}

for (const eventName of requiredProjectEvents) {
  requireSnippet(projectsSpec, 'projects.md', eventName);
  requireSnippet(eventCatalog, 'event catalog', `${eventName}:`);
}

for (const eventName of requiredQuoteEvents) {
  requireSnippet(quotesSpec, 'quotes.md', eventName);
  requireSnippet(eventCatalog, 'event catalog', `${eventName}:`);
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
  'PaginatedCustomersResponse:',
  '/projects:',
  '/projects/archived:',
  '/projects/{projectId}:',
  '/projects/{projectId}/archive:',
  'operationId: listProjects',
  'operationId: createProject',
  'operationId: listArchivedProjects',
  'operationId: getProject',
  'operationId: updateProject',
  'operationId: archiveProject',
  'ProjectStatus:',
  'CreateProjectRequest:',
  'UpdateProjectRequest:',
  'ArchiveProjectRequest:',
  'PaginatedProjectsResponse:',
  '/customers/{customerId}/quotes:',
  '/customers/{customerId}/quotes/{quoteId}:',
  '/customers/{customerId}/quotes/{quoteId}/send:',
  '/customers/{customerId}/quotes/{quoteId}/accept:',
  '/customers/{customerId}/quotes/{quoteId}/reject:',
  '/customers/{customerId}/quotes/{quoteId}/archive:',
  '/customers/{customerId}/quotes/{quoteId}/line-items:',
  '/customers/{customerId}/quotes/{quoteId}/line-items/{lineItemId}:',
  'operationId: listCustomerQuotes',
  'operationId: createCustomerQuote',
  'operationId: getCustomerQuote',
  'operationId: updateCustomerQuote',
  'operationId: sendCustomerQuote',
  'operationId: acceptCustomerQuote',
  'operationId: rejectCustomerQuote',
  'operationId: archiveCustomerQuote',
  'operationId: listQuoteLineItems',
  'operationId: addQuoteLineItem',
  'operationId: updateQuoteLineItem',
  'operationId: removeQuoteLineItem',
  'QuoteStatus:',
  'QuoteLineItem:',
  'Quote:',
  'QuoteWithLineItems:',
  'CreateQuoteRequest:',
  'UpdateQuoteRequest:',
  'CreateQuoteLineItemRequest:',
  'UpdateQuoteLineItemRequest:',
  'PaginatedQuotesResponse:'
];

for (const snippet of requiredOpenApiSnippets) {
  requireSnippet(openApi, 'openapi.yaml', snippet);
}

if (!customersSpec.includes('stored as `deleted_at` in DB')) {
  failures.push('customers.md must document archivedAt -> deleted_at mapping');
}

if (!projectsSpec.includes('stored as `deleted_at` in DB')) {
  failures.push('projects.md must document archivedAt -> deleted_at mapping');
}

if (!quotesSpec.includes('stored as `deleted_at` in DB')) {
  failures.push('quotes.md must document archivedAt -> deleted_at mapping');
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
