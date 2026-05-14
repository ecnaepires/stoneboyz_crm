import type { ProjectStatus } from './project.constants.js';

export const PROJECT_STATUS_TRANSITIONS: Record<ProjectStatus, ReadonlyArray<ProjectStatus>> = {
  draft: ['active', 'completed'],
  active: ['completed'],
  completed: []
};

export const canTransitionProjectStatus = (
  from: ProjectStatus,
  to: ProjectStatus
): boolean => {
  return from === to || PROJECT_STATUS_TRANSITIONS[from].includes(to);
};
