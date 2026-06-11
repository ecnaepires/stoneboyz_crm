import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type {
  ActivityType,
  AppointmentType,
  ArchiveActivityTypeInput,
  CreateActivityTypeInput,
  ListActivityTypesInput,
  ScheduledEventType,
  TemplateKind,
  UpdateActivityTypeInput,
} from '@stoneboyz/domain';
import type { DatabaseError } from 'pg';
import { EventBus } from '../events/event-bus.js';
import {
  buildActivityTypeArchivedPayload,
  buildActivityTypeCreatedPayload,
  buildActivityTypeUpdatedPayload,
} from './activity-type-events.js';
import { ActivityTypesRepository } from './activity-types.repository.js';
import { ShopsRepository } from './shops.repository.js';

const UNIQUE_VIOLATION_CODE = '23505';
const LEGACY_CUSTOM_TYPE_STORAGE: AppointmentType = 'other';

const isDatabaseError = (error: unknown): error is DatabaseError =>
  typeof error === 'object' && error !== null && 'code' in error;

export interface ResolvedActivityTypeForWrite {
  activityTypeId: string | null;
  appointmentType: AppointmentType | null;
  activityType: ActivityType | null;
}

@Injectable()
export class ActivityTypesService {
  constructor(
    private readonly activityTypesRepository: ActivityTypesRepository,
    private readonly shopsRepository: ShopsRepository,
    private readonly eventBus: EventBus
  ) {}

  async list(input: ListActivityTypesInput): Promise<{ data: ActivityType[] }> {
    const shop = await this.shopsRepository.currentShop();
    return { data: await this.activityTypesRepository.list(shop.id, input.includeArchived ?? false) };
  }

  async getById(activityTypeId: string): Promise<ActivityType> {
    const shop = await this.shopsRepository.currentShop();
    return this.ensureActivityType(shop.id, activityTypeId);
  }

  async create(input: CreateActivityTypeInput): Promise<ActivityType> {
    const shop = await this.shopsRepository.currentShop();

    try {
      const activityType = await this.activityTypesRepository.create(shop.id, input);
      this.eventBus.emit(
        'activity_type.created',
        buildActivityTypeCreatedPayload(activityType.id, shop.id, input.actorUserId, activityType.name)
      );
      return activityType;
    } catch (error) {
      if (isDatabaseError(error) && error.code === UNIQUE_VIOLATION_CODE) {
        throw new ConflictException({ code: 'DUPLICATE_ACTIVITY_TYPE_NAME', message: 'Activity type name already exists' });
      }
      throw error;
    }
  }

  async update(activityTypeId: string, input: UpdateActivityTypeInput): Promise<ActivityType> {
    const shop = await this.shopsRepository.currentShop();
    await this.ensureActivityType(shop.id, activityTypeId);

    try {
      const activityType = await this.activityTypesRepository.update(shop.id, activityTypeId, input);
      if (activityType === null) {
        throw new NotFoundException({ code: 'NOT_FOUND', message: 'Activity type not found' });
      }

      this.eventBus.emit(
        'activity_type.updated',
        buildActivityTypeUpdatedPayload(
          activityType.id,
          shop.id,
          input.actorUserId,
          Object.keys(input).filter((key) => key !== 'actorUserId')
        )
      );
      return activityType;
    } catch (error) {
      if (isDatabaseError(error) && error.code === UNIQUE_VIOLATION_CODE) {
        throw new ConflictException({ code: 'DUPLICATE_ACTIVITY_TYPE_NAME', message: 'Activity type name already exists' });
      }
      throw error;
    }
  }

  async archive(activityTypeId: string, input: ArchiveActivityTypeInput): Promise<ActivityType> {
    const shop = await this.shopsRepository.currentShop();
    await this.ensureActivityType(shop.id, activityTypeId);
    const activityType = await this.activityTypesRepository.archive(shop.id, activityTypeId);

    if (activityType === null) {
      throw new ConflictException({ code: 'ACTIVITY_TYPE_ALREADY_ARCHIVED', message: 'Activity type is already archived' });
    }

    this.eventBus.emit(
      'activity_type.archived',
      buildActivityTypeArchivedPayload(activityType.id, shop.id, input.actorUserId)
    );
    return activityType;
  }

  async resolveForWrite(input: {
    eventType: ScheduledEventType;
    activityTypeId?: string | null | undefined;
    appointmentType?: AppointmentType | null | undefined;
    templateKind?: TemplateKind | null | undefined;
  }): Promise<ResolvedActivityTypeForWrite> {
    const shop = await this.shopsRepository.currentShop();

    if (input.eventType === 'shop_job') {
      if (input.activityTypeId != null || input.appointmentType != null) {
        throw this.validationError({
          activityTypeId: ['activityTypeId and appointmentType must be null for shop_job events'],
        });
      }

      return { activityTypeId: null, appointmentType: null, activityType: null };
    }

    const byId =
      input.activityTypeId == null
        ? null
        : await this.activityTypesRepository.findById(shop.id, input.activityTypeId);
    if (input.activityTypeId != null && byId === null) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Activity type not found' });
    }

    const byLegacy =
      input.appointmentType == null
        ? null
        : await this.activityTypesRepository.findBySeedSlug(shop.id, input.appointmentType);
    if (input.appointmentType != null && byLegacy === null) {
      throw this.validationError({ appointmentType: ['Unknown appointmentType'] });
    }

    if (byId !== null && byLegacy !== null && byId.id !== byLegacy.id) {
      throw this.validationError({ activityTypeId: ['activityTypeId does not match appointmentType'] });
    }

    const activityType = byId ?? byLegacy;
    if (activityType === null) {
      throw this.validationError({ activityTypeId: ['activityTypeId or appointmentType is required for appointment events'] });
    }

    if (activityType.archivedAt !== null) {
      throw this.validationError({ activityTypeId: ['Archived activity types cannot be used for new work'] });
    }

    if (input.templateKind != null && !activityType.usesTemplateKind) {
      throw this.validationError({ templateKind: ['templateKind is not valid for this activity type'] });
    }

    return {
      activityTypeId: activityType.id,
      appointmentType: activityType.seedSlug ?? LEGACY_CUSTOM_TYPE_STORAGE,
      activityType,
    };
  }

  private async ensureActivityType(shopId: string, activityTypeId: string): Promise<ActivityType> {
    const activityType = await this.activityTypesRepository.findById(shopId, activityTypeId);
    if (activityType === null) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Activity type not found' });
    }
    return activityType;
  }

  private validationError(details: Record<string, string[]>): BadRequestException {
    return new BadRequestException({
      code: 'VALIDATION_ERROR',
      message: 'Request validation failed',
      details,
    });
  }
}
