import type { Project } from '@stoneboyz/domain';
import type {
  ProjectArchivedData,
  ProjectCreatedData,
  ProjectStatusChangedData,
  ProjectUpdatedData
} from '../events/event-types.js';

export const buildProjectCreatedPayload = (
  project: Project,
  actorUserId: string
): ProjectCreatedData => ({
  projectId: project.id,
  customerId: project.customerId,
  actorUserId,
  title: project.title
});

export const buildProjectUpdatedPayload = (
  projectId: string,
  actorUserId: string,
  changedFields: string[]
): ProjectUpdatedData => ({
  projectId,
  actorUserId,
  changedFields
});

export const buildProjectArchivedPayload = (
  projectId: string,
  customerId: string,
  actorUserId: string
): ProjectArchivedData => ({
  projectId,
  customerId,
  actorUserId
});

export const buildProjectStatusChangedPayload = (
  projectId: string,
  actorUserId: string,
  fromStatus: string,
  toStatus: string
): ProjectStatusChangedData => ({
  projectId,
  actorUserId,
  fromStatus,
  toStatus
});
