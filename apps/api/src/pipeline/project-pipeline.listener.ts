import { Inject, Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { isForward } from '@stoneboyz/domain';
import type { PipelineStage } from '@stoneboyz/domain';
import type { Pool } from 'pg';
import { DATABASE_POOL } from '../database.provider.js';
import type { EventEnvelope, ScheduledEventEventData } from '../events/event-types.js';
import { ProjectsService } from '../projects/projects.service.js';

interface ScheduledEventStageRow {
  project_id: string | null;
  pipeline_stage: PipelineStage | null;
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
    await this.advanceFromScheduledEvent(envelope);
  }

  @OnEvent('scheduled_event.created')
  async handleScheduledEventCreated(envelope: EventEnvelope<ScheduledEventEventData>): Promise<void> {
    await this.advanceFromScheduledEvent(envelope);
  }

  private async advanceFromScheduledEvent(envelope: EventEnvelope<ScheduledEventEventData>): Promise<void> {
    try {
      const { scheduledEventId, actorUserId } = envelope.data;

      const result = await this.pool.query<ScheduledEventStageRow>(
        `
          SELECT se.project_id, at.pipeline_stage
          FROM scheduled_events se
          LEFT JOIN activity_types at ON at.id = se.activity_type_id
          WHERE se.id = $1 AND se.deleted_at IS NULL
        `,
        [scheduledEventId]
      );
      const row = result.rows[0];

      if (row === undefined || row.project_id === null || row.pipeline_stage === null) {
        return;
      }

      const stage = row.pipeline_stage;

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
