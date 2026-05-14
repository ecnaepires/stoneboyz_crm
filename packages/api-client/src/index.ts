import createOpenApiClient, { type ClientOptions } from 'openapi-fetch';
import type { paths } from './schema.js';

export type { paths, components, operations } from './schema.js';

export type StoneboyzApiClient = ReturnType<typeof createOpenApiClient<paths>>;

export const createClient = (options: ClientOptions = {}): StoneboyzApiClient => {
  return createOpenApiClient<paths>(options);
};
