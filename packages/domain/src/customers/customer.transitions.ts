import type { CustomerStatus } from './customer.constants.js';

export const CUSTOMER_STATUS_TRANSITIONS: Record<CustomerStatus, ReadonlyArray<CustomerStatus>> = {
  lead: ['qualified'],
  qualified: ['active'],
  active: ['inactive', 'churned'],
  inactive: ['active', 'churned'],
  churned: ['active']
};

export const canTransitionCustomerStatus = (
  from: CustomerStatus,
  to: CustomerStatus
): boolean => {
  return from === to || CUSTOMER_STATUS_TRANSITIONS[from].includes(to);
};
