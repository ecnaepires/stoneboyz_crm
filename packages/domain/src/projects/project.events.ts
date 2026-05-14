import type { ProjectEventName } from './project.constants.js';

export interface ProjectCreatedEvent {
  eventName: Extract<ProjectEventName, 'project.created'>;
  projectId: string;
  customerId: string;
  actorUserId: string;
  title: string;
}

export interface ProjectUpdatedEvent {
  eventName: Extract<ProjectEventName, 'project.updated'>;
  projectId: string;
  actorUserId: string;
  changedFields: string[];
}

export interface ProjectArchivedEvent {
  eventName: Extract<ProjectEventName, 'project.archived'>;
  projectId: string;
  customerId: string;
  actorUserId: string;
}

export interface ProjectStatusChangedEvent {
  eventName: Extract<ProjectEventName, 'project.status_changed'>;
  projectId: string;
  actorUserId: string;
  fromStatus: string;
  toStatus: string;
}
