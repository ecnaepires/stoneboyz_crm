import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { JobActivity, ScheduleJobActivityInput } from '@stoneboyz/domain';
import { ScheduledEventsService } from '../scheduling/scheduled-events.service.js';
import { JobActivitiesRepository } from './job-activities.repository.js';

@Injectable()
export class JobActivitiesService {
  constructor(
    private readonly jobActivitiesRepository: JobActivitiesRepository,
    private readonly scheduledEventsService: ScheduledEventsService
  ) {}

  async list(customerId: string, projectId: string): Promise<JobActivity[]> {
    const exists = await this.jobActivitiesRepository.projectExists(customerId, projectId);

    if (!exists) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Project not found' });
    }

    return this.jobActivitiesRepository.list(customerId, projectId);
  }

  async schedule(
    customerId: string,
    projectId: string,
    activityId: string,
    input: ScheduleJobActivityInput
  ): Promise<JobActivity> {
    const activity = await this.jobActivitiesRepository.findById(customerId, projectId, activityId);

    if (activity === null) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Job activity not found' });
    }

    if (activity.status !== 'not_scheduled' || activity.scheduledEventId !== null) {
      throw new ConflictException({
        code: 'JOB_ACTIVITY_ALREADY_SCHEDULED',
        message: 'This job activity is already scheduled.'
      });
    }

    const durationMinutes = input.durationMinutes ?? activity.durationMinutes;
    const scheduledEvent = await this.scheduledEventsService.create(customerId, {
      actorUserId: input.actorUserId,
      projectId,
      eventType: activity.activityType,
      appointmentType: activity.appointmentType,
      templateKind: activity.templateKind,
      title: activity.title,
      scheduledAt: input.scheduledAt,
      durationMinutes,
      assigneeIds: input.assigneeIds
    });

    const scheduledActivity = await this.jobActivitiesRepository.markScheduled(customerId, projectId, activityId, {
      scheduledEventId: scheduledEvent.id,
      durationMinutes
    });

    if (scheduledActivity === null) {
      throw new ConflictException({
        code: 'JOB_ACTIVITY_ALREADY_SCHEDULED',
        message: 'This job activity is already scheduled.'
      });
    }

    return scheduledActivity;
  }

  async reschedule(
    customerId: string,
    projectId: string,
    activityId: string,
    input: ScheduleJobActivityInput
  ): Promise<JobActivity> {
    const activity = await this.jobActivitiesRepository.findById(customerId, projectId, activityId);

    if (activity === null) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Job activity not found' });
    }

    if (activity.scheduledEventId === null || (activity.status !== 'scheduled' && activity.status !== 'confirmed')) {
      throw new ConflictException({
        code: 'JOB_ACTIVITY_NOT_RESCHEDULABLE',
        message: 'Only scheduled or confirmed job activities can be rescheduled.'
      });
    }

    const durationMinutes = input.durationMinutes ?? activity.durationMinutes;
    await this.scheduledEventsService.update(customerId, activity.scheduledEventId, {
      actorUserId: input.actorUserId,
      scheduledAt: input.scheduledAt,
      durationMinutes,
      assigneeIds: input.assigneeIds
    });

    const updatedActivity = await this.jobActivitiesRepository.updateScheduleDetails(customerId, projectId, activityId, {
      durationMinutes
    });

    if (updatedActivity === null) {
      throw new ConflictException({
        code: 'JOB_ACTIVITY_NOT_RESCHEDULABLE',
        message: 'Only scheduled or confirmed job activities can be rescheduled.'
      });
    }

    return updatedActivity;
  }
}
