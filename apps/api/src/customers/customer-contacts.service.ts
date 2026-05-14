import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type {
  ArchiveCustomerContactInput,
  CreateCustomerContactInput,
  CustomerContact,
  UpdateCustomerContactInput
} from '@stoneboyz/domain';
import type { DatabaseError } from 'pg';
import { EventBus } from '../events/event-bus.js';
import {
  buildCustomerBillingContactChangedPayload,
  buildCustomerContactArchivedPayload,
  buildCustomerContactCreatedPayload,
  buildCustomerContactUpdatedPayload,
  buildCustomerPrimaryContactChangedPayload
} from './customer-events.js';
import { CustomerContactsRepository } from './customer-contacts.repository.js';

const UNIQUE_VIOLATION_CODE = '23505';

const isDatabaseError = (error: unknown): error is DatabaseError => {
  return typeof error === 'object' && error !== null && 'code' in error;
};

@Injectable()
export class CustomerContactsService {
  constructor(
    private readonly customerContactsRepository: CustomerContactsRepository,
    private readonly eventBus: EventBus
  ) {}

  async list(customerId: string): Promise<{ data: CustomerContact[] }> {
    await this.ensureCustomerExists(customerId);

    return {
      data: await this.customerContactsRepository.list(customerId)
    };
  }

  async create(customerId: string, input: CreateCustomerContactInput): Promise<CustomerContact> {
    await this.ensureCustomerExists(customerId);

    try {
      const contact = await this.customerContactsRepository.create(customerId, {
        ...input,
        isPrimary: input.isPrimary ?? false,
        isBilling: input.isBilling ?? false,
        preferredChannel: input.preferredChannel ?? 'none',
        lastName: input.lastName,
        jobTitle: input.jobTitle,
        email: input.email,
        phone: input.phone,
        whatsappPhone: input.whatsappPhone
      });

      this.eventBus.emit(
        'customer.contact_created',
        buildCustomerContactCreatedPayload(customerId, contact.id, input.actorUserId)
      );

      if (contact.isPrimary) {
        this.eventBus.emit(
          'customer.primary_contact_changed',
          buildCustomerPrimaryContactChangedPayload(customerId, contact.id, input.actorUserId)
        );
      }

      if (contact.isBilling) {
        this.eventBus.emit(
          'customer.billing_contact_changed',
          buildCustomerBillingContactChangedPayload(customerId, contact.id, input.actorUserId)
        );
      }

      return contact;
    } catch (error) {
      if (isDatabaseError(error) && error.code === UNIQUE_VIOLATION_CODE) {
        throw new ConflictException({
          code: 'CONFLICT',
          message: 'Contact conflicts with an existing active contact rule'
        });
      }

      throw error;
    }
  }

  async update(
    customerId: string,
    contactId: string,
    input: UpdateCustomerContactInput
  ): Promise<CustomerContact> {
    try {
      const previousContact = await this.customerContactsRepository.findById(customerId, contactId);

      if (previousContact === null) {
        throw new NotFoundException({ code: 'NOT_FOUND', message: 'Customer contact not found' });
      }

      const contact = await this.customerContactsRepository.update(customerId, contactId, input);

      if (contact === null) {
        throw new NotFoundException({ code: 'NOT_FOUND', message: 'Customer contact not found' });
      }

      const changedFields = Object.keys(input).filter((key) => {
        const typedKey = key as keyof UpdateCustomerContactInput;
        return typedKey !== 'actorUserId' && input[typedKey] !== undefined;
      });

      this.eventBus.emit(
        'customer.contact_updated',
        buildCustomerContactUpdatedPayload(customerId, contactId, input.actorUserId, changedFields)
      );

      if (!previousContact.isPrimary && contact.isPrimary) {
        this.eventBus.emit(
          'customer.primary_contact_changed',
          buildCustomerPrimaryContactChangedPayload(customerId, contactId, input.actorUserId)
        );
      }

      if (!previousContact.isBilling && contact.isBilling) {
        this.eventBus.emit(
          'customer.billing_contact_changed',
          buildCustomerBillingContactChangedPayload(customerId, contactId, input.actorUserId)
        );
      }

      return contact;
    } catch (error) {
      if (isDatabaseError(error) && error.code === UNIQUE_VIOLATION_CODE) {
        throw new ConflictException({
          code: 'CONFLICT',
          message: 'Contact conflicts with an existing active contact rule'
        });
      }

      throw error;
    }
  }

  async makePrimary(customerId: string, contactId: string, actorUserId: string): Promise<CustomerContact> {
    await this.ensureCustomerExists(customerId);

    const contact = await this.customerContactsRepository.makePrimary(customerId, contactId);

    if (contact === null) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Customer contact not found' });
    }

    this.eventBus.emit(
      'customer.primary_contact_changed',
      buildCustomerPrimaryContactChangedPayload(customerId, contactId, actorUserId)
    );

    return contact;
  }

  async makeBilling(customerId: string, contactId: string, actorUserId: string): Promise<CustomerContact> {
    await this.ensureCustomerExists(customerId);

    const contact = await this.customerContactsRepository.makeBilling(customerId, contactId);

    if (contact === null) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Customer contact not found' });
    }

    this.eventBus.emit(
      'customer.billing_contact_changed',
      buildCustomerBillingContactChangedPayload(customerId, contactId, actorUserId)
    );

    return contact;
  }

  async archive(
    customerId: string,
    contactId: string,
    input: ArchiveCustomerContactInput
  ): Promise<CustomerContact> {
    const contact = await this.customerContactsRepository.archive(customerId, contactId);

    if (contact === null) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Customer contact not found' });
    }

    this.eventBus.emit(
      'customer.contact_archived',
      buildCustomerContactArchivedPayload(customerId, contactId, input.actorUserId)
    );

    return contact;
  }

  private async ensureCustomerExists(customerId: string): Promise<void> {
    const exists = await this.customerContactsRepository.customerExists(customerId);

    if (!exists) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Customer not found' });
    }
  }
}
