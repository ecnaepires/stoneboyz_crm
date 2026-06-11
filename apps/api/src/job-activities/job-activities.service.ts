import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { addBusinessDays, DEFAULT_AUTOSCHEDULE_HOUR_UTC } from '@stoneboyz/domain';
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
      activityTypeId: activity.activityTypeId,
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

    await this.autoscheduleFollowers(customerId, projectId, scheduledActivity, input.scheduledAt, input.actorUserId);

    return scheduledActivity;
  }

  /**
   * Chain every later still-unscheduled activity from the anchor: each lands
   * its offset in business days (Mon-Fri, default 1) after the previous link,
   * pinned to 08:00 UTC as a placeholder time meant to be edited. The anchor
   * itself keeps autoschedule_state = null; followers get 'autoscheduled'.
   */
  private async autoscheduleFollowers(
    customerId: string,
    projectId: string,
    anchor: JobActivity,
    anchorScheduledAt: string,
    actorUserId: string
  ): Promise<void> {
    const activities = await this.jobActivitiesRepository.list(customerId, projectId);
    const followers = activities
      .filter(
        (candidate) =>
          candidate.sortOrder > anchor.sortOrder &&
          candidate.status === 'not_scheduled' &&
          candidate.scheduledEventId === null
      )
      .sort((left, right) => left.sortOrder - right.sortOrder);

    let previousAt = new Date(anchorScheduledAt);
    for (const follower of followers) {
      const offsetDays = follower.autoscheduleOffsetAmount ?? 1;
      const scheduledAt = addBusinessDays(previousAt, offsetDays);
      scheduledAt.setUTCHours(DEFAULT_AUTOSCHEDULE_HOUR_UTC, 0, 0, 0);

      if (follower.autoscheduleEligible) {
        const event = await this.scheduledEventsService.create(customerId, {
          actorUserId,
          projectId,
          eventType: follower.activityType,
          activityTypeId: follower.activityTypeId,
          appointmentType: follower.appointmentType,
          templateKind: follower.templateKind,
          title: follower.title,
          scheduledAt: scheduledAt.toISOString(),
          durationMinutes: follower.durationMinutes,
          assigneeIds: []
        });

        await this.jobActivitiesRepository.markScheduled(customerId, projectId, follower.id, {
          scheduledEventId: event.id,
          durationMinutes: follower.durationMinutes,
          autoscheduleState: 'autoscheduled'
        });
      }

      previousAt = scheduledAt;
    }
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
      durationMinutes,
      markManualOverride: activity.autoscheduleState === 'autoscheduled'
    });

    if (updatedActivity === null) {
      throw new ConflictException({
        code: 'JOB_ACTIVITY_NOT_RESCHEDULABLE',
        message: 'Only scheduled or confirmed job activities can be rescheduled.'
      });
    }

    await this.rechainFollowers(customerId, projectId, updatedActivity, input.scheduledAt, input.actorUserId);

    return updatedActivity;
  }

  /**
   * Recompute the autoschedule chain downstream of a rescheduled activity.
   * Only followers still in 'autoscheduled' state with status scheduled or
   * confirmed are moved; manually overridden, in-progress, completed, and
   * cancelled followers are never touched, but the chain math continues
   * through their slot so later links stay spaced.
   */
  private async rechainFollowers(
    customerId: string,
    projectId: string,
    rescheduled: JobActivity,
    rescheduledAt: string,
    actorUserId: string
  ): Promise<void> {
    const activities = await this.jobActivitiesRepository.list(customerId, projectId);
    const followers = activities
      .filter((candidate) => candidate.sortOrder > rescheduled.sortOrder)
      .sort((left, right) => left.sortOrder - right.sortOrder);

    let previousAt = new Date(rescheduledAt);
    for (const follower of followers) {
      const offsetDays = follower.autoscheduleOffsetAmount ?? 1;
      const scheduledAt = addBusinessDays(previousAt, offsetDays);
      scheduledAt.setUTCHours(DEFAULT_AUTOSCHEDULE_HOUR_UTC, 0, 0, 0);

      const movable =
        follower.autoscheduleEligible &&
        follower.autoscheduleState === 'autoscheduled' &&
        (follower.status === 'scheduled' || follower.status === 'confirmed') &&
        follower.scheduledEventId !== null;

      if (movable && follower.scheduledEventId !== null) {
        await this.scheduledEventsService.update(customerId, follower.scheduledEventId, {
          actorUserId,
          scheduledAt: scheduledAt.toISOString()
        });
      }

      previousAt = scheduledAt;
    }
  }
}
