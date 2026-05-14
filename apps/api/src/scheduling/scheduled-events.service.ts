import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type {
  ArchiveScheduledEventInput,
  CreateScheduledEventInput,
  ListScheduledEventsInput,
  ScheduledEvent,
  TransitionScheduledEventInput,
  UpdateScheduledEventInput
} from '@stoneboyz/domain';
import type { DatabaseError } from 'pg';
import { EventBus } from '../events/event-bus.js';
import {
  buildScheduledEventArchivedPayload,
  buildScheduledEventCreatedPayload,
  buildScheduledEventRescheduledPayload,
  buildScheduledEventTransitionPayload,
  buildScheduledEventUpdatedPayload
} from './scheduled-event-events.js';
import {
  InvalidScheduledEventCursorError,
  InvalidScheduledEventStatusError,
  ScheduledEventsRepository
} from './scheduled-events.repository.js';

const FOREIGN_KEY_VIOLATION_CODE = '23503';

const isDatabaseError = (error: unknown): error is DatabaseError => {
  return typeof error === 'object' && error !== null && 'code' in error;
};

const isDifferentInstant = (left: string, right: string): boolean => {
  return new Date(left).getTime() !== new Date(right).getTime();
};

@Injectable()
export class ScheduledEventsService {
  constructor(
    private readonly scheduledEventsRepository: ScheduledEventsRepository,
    private readonly eventBus: EventBus
  ) {}

  async list(
    customerId: string,
    input: ListScheduledEventsInput
  ): Promise<{ data: ScheduledEvent[]; nextCursor: string | null; hasMore: boolean }> {
    await this.ensureCustomerExists(customerId);

    try {
      return await this.scheduledEventsRepository.list(customerId, {
        ...input,
        limit: input.limit ?? 25
      });
    } catch (error) {
      if (error instanceof InvalidScheduledEventCursorError) {
        throw new BadRequestException({
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: { cursor: ['Invalid cursor'] }
        });
      }

      throw error;
    }
  }

  async create(customerId: string, input: CreateScheduledEventInput): Promise<ScheduledEvent> {
    await this.ensureCustomerExists(customerId);
    this.ensureValidEventTypeFields(input.eventType, input.appointmentType ?? null);

    try {
      const scheduledEvent = await this.scheduledEventsRepository.create(customerId, input);
      this.eventBus.emit(
        'scheduled_event.created',
        buildScheduledEventCreatedPayload(customerId, scheduledEvent.id, input.actorUserId)
      );

      return scheduledEvent;
    } catch (error) {
      if (isDatabaseError(error) && error.code === FOREIGN_KEY_VIOLATION_CODE) {
        throw new NotFoundException({ code: 'NOT_FOUND', message: 'Project not found' });
      }

      throw error;
    }
  }

  async getById(customerId: string, eventId: string): Promise<ScheduledEvent> {
    await this.ensureCustomerExists(customerId);

    return this.ensureScheduledEventExists(customerId, eventId);
  }

  async update(customerId: string, eventId: string, input: UpdateScheduledEventInput): Promise<ScheduledEvent> {
    const current = await this.ensureScheduledEventExists(customerId, eventId);

    if (current.status !== 'scheduled' && current.status !== 'confirmed') {
      throw this.invalidStatus('Event status does not allow updates');
    }

    this.ensureValidAppointmentTypeUpdate(current, input);

    try {
      const scheduledEvent = await this.scheduledEventsRepository.update(customerId, eventId, input);

      if (scheduledEvent === null) {
        throw new NotFoundException({ code: 'NOT_FOUND', message: 'Scheduled event not found' });
      }

      const changedFields = Object.keys(input).filter((key) => key !== 'actorUserId');
      this.eventBus.emit(
        'scheduled_event.updated',
        buildScheduledEventUpdatedPayload(customerId, eventId, input.actorUserId, changedFields)
      );

      if (input.scheduledAt !== undefined && isDifferentInstant(current.scheduledAt, input.scheduledAt)) {
        this.eventBus.emit(
          'scheduled_event.rescheduled',
          buildScheduledEventRescheduledPayload(customerId, eventId, input.actorUserId, current.scheduledAt, scheduledEvent.scheduledAt)
        );
      }

      return scheduledEvent;
    } catch (error) {
      if (error instanceof InvalidScheduledEventStatusError) {
        throw this.invalidStatus('Event status does not allow updates');
      }

      if (isDatabaseError(error) && error.code === FOREIGN_KEY_VIOLATION_CODE) {
        throw new NotFoundException({ code: 'NOT_FOUND', message: 'Project not found' });
      }

      throw error;
    }
  }

  async confirm(customerId: string, eventId: string, input: TransitionScheduledEventInput): Promise<ScheduledEvent> {
    return this.transition(customerId, eventId, input, 'scheduled', 'confirmed', 'scheduled_event.confirmed');
  }

  async start(customerId: string, eventId: string, input: TransitionScheduledEventInput): Promise<ScheduledEvent> {
    return this.transition(customerId, eventId, input, 'confirmed', 'in_progress', 'scheduled_event.started');
  }

  async complete(customerId: string, eventId: string, input: TransitionScheduledEventInput): Promise<ScheduledEvent> {
    return this.transition(customerId, eventId, input, 'in_progress', 'completed', 'scheduled_event.completed');
  }

  async cancel(customerId: string, eventId: string, input: TransitionScheduledEventInput): Promise<ScheduledEvent> {
    const current = await this.ensureScheduledEventExists(customerId, eventId);

    if (current.status !== 'scheduled' && current.status !== 'confirmed' && current.status !== 'in_progress') {
      throw this.invalidStatus('Event status does not allow cancellation');
    }

    try {
      const scheduledEvent = await this.scheduledEventsRepository.cancel(customerId, eventId);

      if (scheduledEvent === null) {
        throw new NotFoundException({ code: 'NOT_FOUND', message: 'Scheduled event not found' });
      }

      this.eventBus.emit('scheduled_event.cancelled', buildScheduledEventTransitionPayload(customerId, eventId, input.actorUserId));

      return scheduledEvent;
    } catch (error) {
      if (error instanceof InvalidScheduledEventStatusError) {
        throw this.invalidStatus('Event status does not allow cancellation');
      }

      throw error;
    }
  }

  async archive(customerId: string, eventId: string, input: ArchiveScheduledEventInput): Promise<ScheduledEvent> {
    const current = await this.ensureScheduledEventExists(customerId, eventId);

    if (current.status !== 'completed' && current.status !== 'cancelled') {
      throw this.invalidStatus('Event status does not allow archive');
    }

    try {
      const scheduledEvent = await this.scheduledEventsRepository.archive(customerId, eventId, input.actorUserId);

      if (scheduledEvent === null) {
        throw new NotFoundException({ code: 'NOT_FOUND', message: 'Scheduled event not found' });
      }

      this.eventBus.emit('scheduled_event.archived', buildScheduledEventArchivedPayload(customerId, eventId, input.actorUserId));

      return scheduledEvent;
    } catch (error) {
      if (error instanceof InvalidScheduledEventStatusError) {
        throw this.invalidStatus('Event status does not allow archive');
      }

      throw error;
    }
  }

  private async transition(
    customerId: string,
    eventId: string,
    input: TransitionScheduledEventInput,
    fromStatus: ScheduledEvent['status'],
    toStatus: ScheduledEvent['status'],
    eventName: 'scheduled_event.confirmed' | 'scheduled_event.started' | 'scheduled_event.completed'
  ): Promise<ScheduledEvent> {
    const current = await this.ensureScheduledEventExists(customerId, eventId);

    if (current.status !== fromStatus) {
      throw this.invalidStatus(`Event is not in ${fromStatus} status`);
    }

    try {
      const scheduledEvent =
        toStatus === 'confirmed'
          ? await this.scheduledEventsRepository.confirm(customerId, eventId)
          : toStatus === 'in_progress'
            ? await this.scheduledEventsRepository.start(customerId, eventId)
            : await this.scheduledEventsRepository.complete(customerId, eventId);

      if (scheduledEvent === null) {
        throw new NotFoundException({ code: 'NOT_FOUND', message: 'Scheduled event not found' });
      }

      this.eventBus.emit(eventName, buildScheduledEventTransitionPayload(customerId, eventId, input.actorUserId));

      return scheduledEvent;
    } catch (error) {
      if (error instanceof InvalidScheduledEventStatusError) {
        throw this.invalidStatus(`Event is not in ${fromStatus} status`);
      }

      throw error;
    }
  }

  private async ensureCustomerExists(customerId: string): Promise<void> {
    const exists = await this.scheduledEventsRepository.customerExists(customerId);

    if (!exists) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Customer not found' });
    }
  }

  private async ensureScheduledEventExists(customerId: string, eventId: string): Promise<ScheduledEvent> {
    const scheduledEvent = await this.scheduledEventsRepository.findById(customerId, eventId);

    if (scheduledEvent === null) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Scheduled event not found' });
    }

    return scheduledEvent;
  }

  private ensureValidAppointmentTypeUpdate(current: ScheduledEvent, input: UpdateScheduledEventInput): void {
    if (!Object.hasOwn(input, 'appointmentType')) {
      return;
    }

    this.ensureValidEventTypeFields(current.eventType, input.appointmentType ?? null);
  }

  private ensureValidEventTypeFields(eventType: ScheduledEvent['eventType'], appointmentType: ScheduledEvent['appointmentType']): void {
    if (eventType === 'appointment' && appointmentType === null) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: { appointmentType: ['appointmentType is required for appointment events'] }
      });
    }

    if (eventType === 'shop_job' && appointmentType !== null) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: { appointmentType: ['appointmentType must be null for shop_job events'] }
      });
    }
  }

  private invalidStatus(message: string): ConflictException {
    return new ConflictException({ code: 'INVALID_SCHEDULED_EVENT_STATUS', message });
  }
}
