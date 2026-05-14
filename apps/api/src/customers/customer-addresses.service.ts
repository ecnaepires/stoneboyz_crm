import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type {
  ArchiveCustomerAddressInput,
  CreateCustomerAddressInput,
  CustomerAddress,
  UpdateCustomerAddressInput
} from '@stoneboyz/domain';
import type { DatabaseError } from 'pg';
import { EventBus } from '../events/event-bus.js';
import {
  buildCustomerAddressArchivedPayload,
  buildCustomerAddressCreatedPayload,
  buildCustomerAddressUpdatedPayload,
  buildCustomerBillingAddressChangedPayload
} from './customer-events.js';
import { CustomerAddressesRepository } from './customer-addresses.repository.js';

const UNIQUE_VIOLATION_CODE = '23505';

const isDatabaseError = (error: unknown): error is DatabaseError => {
  return typeof error === 'object' && error !== null && 'code' in error;
};

@Injectable()
export class CustomerAddressesService {
  constructor(
    private readonly customerAddressesRepository: CustomerAddressesRepository,
    private readonly eventBus: EventBus
  ) {}

  async list(customerId: string): Promise<{ data: CustomerAddress[] }> {
    await this.ensureCustomerExists(customerId);

    return {
      data: await this.customerAddressesRepository.list(customerId)
    };
  }

  async create(customerId: string, input: CreateCustomerAddressInput): Promise<CustomerAddress> {
    await this.ensureCustomerExists(customerId);

    try {
      const address = await this.customerAddressesRepository.create(customerId, {
        ...input,
        line2: input.line2,
        region: input.region,
        postalCode: input.postalCode,
        isPrimary: input.isPrimary ?? false,
        isBilling: input.isBilling ?? false
      });

      this.eventBus.emit(
        'customer.address_created',
        buildCustomerAddressCreatedPayload(customerId, address.id, input.actorUserId)
      );

      if (address.isBilling) {
        this.eventBus.emit(
          'customer.billing_address_changed',
          buildCustomerBillingAddressChangedPayload(customerId, address.id, input.actorUserId)
        );
      }

      return address;
    } catch (error) {
      if (isDatabaseError(error) && error.code === UNIQUE_VIOLATION_CODE) {
        throw new ConflictException({
          code: 'CONFLICT',
          message: 'Address conflicts with an existing active address rule'
        });
      }

      throw error;
    }
  }

  async update(
    customerId: string,
    addressId: string,
    input: UpdateCustomerAddressInput
  ): Promise<CustomerAddress> {
    try {
      const previousAddress = await this.customerAddressesRepository.findById(customerId, addressId);

      if (previousAddress === null) {
        throw new NotFoundException({ code: 'NOT_FOUND', message: 'Customer address not found' });
      }

      const address = await this.customerAddressesRepository.update(customerId, addressId, input);

      if (address === null) {
        throw new NotFoundException({ code: 'NOT_FOUND', message: 'Customer address not found' });
      }

      const changedFields = Object.keys(input).filter((key) => {
        const typedKey = key as keyof UpdateCustomerAddressInput;
        return typedKey !== 'actorUserId' && input[typedKey] !== undefined;
      });

      this.eventBus.emit(
        'customer.address_updated',
        buildCustomerAddressUpdatedPayload(customerId, addressId, input.actorUserId, changedFields)
      );

      if (!previousAddress.isBilling && address.isBilling) {
        this.eventBus.emit(
          'customer.billing_address_changed',
          buildCustomerBillingAddressChangedPayload(customerId, addressId, input.actorUserId)
        );
      }

      return address;
    } catch (error) {
      if (isDatabaseError(error) && error.code === UNIQUE_VIOLATION_CODE) {
        throw new ConflictException({
          code: 'CONFLICT',
          message: 'Address conflicts with an existing active address rule'
        });
      }

      throw error;
    }
  }

  async archive(
    customerId: string,
    addressId: string,
    input: ArchiveCustomerAddressInput
  ): Promise<CustomerAddress> {
    const address = await this.customerAddressesRepository.archive(customerId, addressId);

    if (address === null) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Customer address not found' });
    }

    this.eventBus.emit(
      'customer.address_archived',
      buildCustomerAddressArchivedPayload(customerId, addressId, input.actorUserId)
    );

    return address;
  }

  async makeBilling(customerId: string, addressId: string, actorUserId: string): Promise<CustomerAddress> {
    await this.ensureCustomerExists(customerId);

    const address = await this.customerAddressesRepository.makeBilling(customerId, addressId);

    if (address === null) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Customer address not found' });
    }

    this.eventBus.emit(
      'customer.billing_address_changed',
      buildCustomerBillingAddressChangedPayload(customerId, addressId, actorUserId)
    );

    return address;
  }

  private async ensureCustomerExists(customerId: string): Promise<void> {
    const exists = await this.customerAddressesRepository.customerExists(customerId);

    if (!exists) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Customer not found' });
    }
  }
}
