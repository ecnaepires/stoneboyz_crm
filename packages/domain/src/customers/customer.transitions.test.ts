import { describe, expect, it } from 'vitest';
import type { CustomerStatus } from './customer.constants.js';
import { CUSTOMER_STATUS_VALUES } from './customer.constants.js';
import {
  CUSTOMER_STATUS_TRANSITIONS,
  canTransitionCustomerStatus
} from './customer.transitions.js';

describe('canTransitionCustomerStatus', () => {
  it.each(
    Object.entries(CUSTOMER_STATUS_TRANSITIONS).flatMap(([from, destinations]) =>
      destinations.map((to) => [from as CustomerStatus, to])
    )
  )('allows %s to %s', (from, to) => {
    expect(canTransitionCustomerStatus(from, to)).toBe(true);
  });

  it.each(CUSTOMER_STATUS_VALUES)('allows %s to itself', (status) => {
    expect(canTransitionCustomerStatus(status, status)).toBe(true);
  });

  it.each([
    ['lead', 'active'],
    ['lead', 'churned'],
    ['qualified', 'inactive'],
    ['churned', 'lead'],
    ['active', 'qualified']
  ] satisfies Array<[CustomerStatus, CustomerStatus]>)('rejects %s to %s', (from, to) => {
    expect(canTransitionCustomerStatus(from, to)).toBe(false);
  });
});
