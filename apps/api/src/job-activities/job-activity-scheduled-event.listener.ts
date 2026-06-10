import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { JobActivity } from '@stoneboyz/domain';
import type { EventEnvelope, ScheduledEventEventData } from '../events/event-types.js';
import { JobActivitiesRepository } from './job-activities.repository.js';

@Injectable()
export class JobActivityScheduledEventListener {
  constructor(private readonly jobActivitiesRepository: JobActivitiesRepository) {}

  @OnEvent('scheduled_event.confirmed')
  async handleConfirmed(envelope: EventEnvelope<ScheduledEventEventData>): Promise<void> {
    await this.syncStatus(envelope, 'confirmed');
  }

  @OnEvent('scheduled_event.started')
  async handleStarted(envelope: EventEnvelope<ScheduledEventEventData>): Promise<void> {
    await this.syncStatus(envelope, 'in_progress');
  }

  @OnEvent('scheduled_event.completed')
  async handleCompleted(envelope: EventEnvelope<ScheduledEventEventData>): Promise<void> {
    await this.syncStatus(envelope, 'completed');
  }

  @OnEvent('scheduled_event.cancelled')
  async handleCancelled(envelope: EventEnvelope<ScheduledEventEventData>): Promise<void> {
    await this.syncStatus(envelope, 'cancelled');
  }

  private async syncStatus(
    envelope: EventEnvelope<ScheduledEventEventData>,
    status: JobActivity['status']
  ): Promise<void> {
    await this.jobActivitiesRepository.updateStatusByScheduledEventId(
      envelope.data.customerId,
      envelope.data.scheduledEventId,
      status
    );
  }
}
