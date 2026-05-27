import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { canTransitionCustomerStatus } from '@stoneboyz/domain';
import type { ArchiveCustomerInput, CreateCustomerInput, Customer, ListCustomersInput, RestoreCustomerInput, UpdateCustomerInput } from '@stoneboyz/domain';
import type { DatabaseError } from 'pg';
import { EventBus } from '../events/event-bus.js';
import {
  buildCustomerAddressArchivedPayload,
  buildCustomerArchivedPayload,
  buildCustomerContactArchivedPayload,
  buildCustomerCreatedPayload,
  buildCustomerNoteArchivedPayload,
  buildCustomerRestoredPayload,
  buildCustomerStatusChangedPayload,
  buildCustomerUpdatedPayload,
  buildProjectArchivedByCustomerPayload
} from './customer-events.js';
import { CustomersRepository, InvalidCustomerCursorError } from './customers.repository.js';

interface PaginatedCustomersResponse {
  data: Customer[];
  nextCursor: string | null;
  hasMore: boolean;
}

const UNIQUE_VIOLATION_CODE = '23505';
const FOREIGN_KEY_VIOLATION_CODE = '23503';

const isDatabaseError = (error: unknown): error is DatabaseError => {
  return typeof error === 'object' && error !== null && 'code' in error;
};

@Injectable()
export class CustomersService {
  constructor(
    private readonly customersRepository: CustomersRepository,
    private readonly eventBus: EventBus
  ) {}

  async list(input: ListCustomersInput): Promise<PaginatedCustomersResponse> {
    try {
      return await this.customersRepository.list({
        ...input,
        limit: input.limit ?? 25,
        sortBy: input.sortBy ?? 'updatedAt',
        sortDirection: input.sortDirection ?? 'desc'
      });
    } catch (error) {
      if (error instanceof InvalidCustomerCursorError) {
        throw new BadRequestException({
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: { cursor: ['Invalid cursor'] }
        });
      }

      throw error;
    }
  }

  async create(input: CreateCustomerInput): Promise<Customer> {
    try {
      const customer = await this.customersRepository.create(input);
      this.eventBus.emit('customer.created', buildCustomerCreatedPayload(customer, input.actorUserId));
      return customer;
    } catch (error) {
      if (isDatabaseError(error) && error.code === UNIQUE_VIOLATION_CODE) {
        throw new ConflictException({
          code: 'CONFLICT',
          message: 'Customer conflicts with an existing non-archived customer'
        });
      }

      if (isDatabaseError(error) && error.code === FOREIGN_KEY_VIOLATION_CODE) {
        throw new NotFoundException({ code: 'NOT_FOUND', message: 'Price list not found' });
      }

      throw error;
    }
  }

  async getById(customerId: string): Promise<Customer> {
    const customer = await this.customersRepository.findById(customerId);

    if (customer === null) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Customer not found' });
    }

    return customer;
  }

  async update(customerId: string, input: UpdateCustomerInput): Promise<Customer> {
    try {
      let previousStatus: Customer['status'] | undefined;

      if (input.status !== undefined) {
        const current = await this.customersRepository.findById(customerId);

        if (current === null) {
          throw new NotFoundException({ code: 'NOT_FOUND', message: 'Customer not found' });
        }

        if (!canTransitionCustomerStatus(current.status, input.status)) {
          throw new BadRequestException({
            code: 'INVALID_STATUS_TRANSITION',
            message: `Cannot transition customer status from ${current.status} to ${input.status}`,
            details: { from: current.status, to: input.status }
          });
        }

        previousStatus = current.status;
      }

      const customer = await this.customersRepository.update(customerId, input);

      if (customer === null) {
        throw new NotFoundException({ code: 'NOT_FOUND', message: 'Customer not found' });
      }

      const changedFields = Object.keys(input).filter((key) => {
        const typedKey = key as keyof UpdateCustomerInput;
        return typedKey !== 'actorUserId' && input[typedKey] !== undefined;
      });

      this.eventBus.emit(
        'customer.updated',
        buildCustomerUpdatedPayload(customerId, input.actorUserId, changedFields)
      );

      if (
        input.status !== undefined &&
        previousStatus !== undefined &&
        previousStatus !== input.status
      ) {
        this.eventBus.emit(
          'customer.status_changed',
          buildCustomerStatusChangedPayload(customerId, input.actorUserId, previousStatus, input.status)
        );
      }

      return customer;
    } catch (error) {
      if (isDatabaseError(error) && error.code === UNIQUE_VIOLATION_CODE) {
        throw new ConflictException({
          code: 'CONFLICT',
          message: 'Customer conflicts with an existing non-archived customer'
        });
      }

      if (isDatabaseError(error) && error.code === FOREIGN_KEY_VIOLATION_CODE) {
        throw new NotFoundException({ code: 'NOT_FOUND', message: 'Price list not found' });
      }

      throw error;
    }
  }

  async archive(customerId: string, input: ArchiveCustomerInput): Promise<Customer> {
    const result = await this.customersRepository.archive(customerId, input);

    if (result === null) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Customer not found' });
    }

    this.eventBus.emit(
      'customer.archived',
      buildCustomerArchivedPayload(customerId, input.actorUserId, input.archiveReason)
    );

    for (const contactId of result.archivedContactIds) {
      this.eventBus.emit(
        'customer.contact_archived',
        buildCustomerContactArchivedPayload(customerId, contactId, input.actorUserId)
      );
    }

    for (const addressId of result.archivedAddressIds) {
      this.eventBus.emit(
        'customer.address_archived',
        buildCustomerAddressArchivedPayload(customerId, addressId, input.actorUserId)
      );
    }

    for (const noteId of result.archivedNoteIds) {
      this.eventBus.emit(
        'customer.note_archived',
        buildCustomerNoteArchivedPayload(customerId, noteId, input.actorUserId)
      );
    }

    for (const projectId of result.archivedProjectIds) {
      this.eventBus.emit(
        'project.archived',
        buildProjectArchivedByCustomerPayload(customerId, projectId, input.actorUserId)
      );
    }

    return result.customer;
  }

  async restore(customerId: string, input: RestoreCustomerInput): Promise<Customer> {
    try {
      const customer = await this.customersRepository.restore(customerId, input);

      if (customer === null) {
        throw new NotFoundException({ code: 'NOT_FOUND', message: 'Archived customer not found' });
      }

      this.eventBus.emit('customer.restored', buildCustomerRestoredPayload(customerId, input.actorUserId));

      return customer;
    } catch (error) {
      if (isDatabaseError(error) && error.code === UNIQUE_VIOLATION_CODE) {
        throw new ConflictException({
          code: 'CONFLICT',
          message: 'Customer conflicts with an existing non-archived customer'
        });
      }

      throw error;
    }
  }
}
