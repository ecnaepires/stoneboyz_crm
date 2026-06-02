import { Inject, Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { isForward, stageFromAppointmentType } from '@stoneboyz/domain';
import type { AppointmentType } from '@stoneboyz/domain';
import type { Pool } from 'pg';
import { DATABASE_POOL } from '../database.provider.js';
import type { EventEnvelope, ScheduledEventEventData } from '../events/event-types.js';
import { ProjectsService } from '../projects/projects.service.js';

interface ScheduledEventStageRow {
  project_id: string | null;
  appointment_type: string | null;
}

@Injectable()
export class ProjectPipelineListener {
  private readonly logger = new Logger(ProjectPipelineListener.name);

  constructor(
    @Inject(DATABASE_POOL) private readonly pool: Pool,
    private readonly projectsService: ProjectsService
  ) {}

  @OnEvent('scheduled_event.completed')
  async handleScheduledEventCompleted(envelope: EventEnvelope<ScheduledEventEventData>): Promise<void> {
    try {
      const { scheduledEventId, actorUserId } = envelope.data;

      const result = await this.pool.query<ScheduledEventStageRow>(
        'SELECT project_id, appointment_type FROM scheduled_events WHERE id = $1 AND deleted_at IS NULL',
        [scheduledEventId]
      );
      const row = result.rows[0];

      if (row === undefined || row.project_id === null || row.appointment_type === null) {
        return;
      }

      const stage = stageFromAppointmentType(row.appointment_type as AppointmentType);
      if (stage === null) {
        return;
      }

      const project = await this.projectsService.getById(row.project_id);
      if (!isForward(project.pipelineStage, stage)) {
        return;
      }

      await this.projectsService.setStage(row.project_id, { actorUserId, stage }, 'auto');
    } catch (error) {
      this.logger.error(
        'Failed to auto-advance pipeline stage',
        error instanceof Error ? error.stack : String(error)
      );
    }
  }
}
