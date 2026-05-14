export const PROJECT_STATUS_VALUES = ['draft', 'active', 'completed'] as const;
export type ProjectStatus = (typeof PROJECT_STATUS_VALUES)[number];

export const PROJECT_SORT_BY_VALUES = ['title', 'createdAt', 'updatedAt', 'status'] as const;
export type ProjectSortBy = (typeof PROJECT_SORT_BY_VALUES)[number];

export const PROJECT_EVENT_NAMES = [
  'project.created',
  'project.updated',
  'project.archived',
  'project.status_changed'
] as const;
export type ProjectEventName = (typeof PROJECT_EVENT_NAMES)[number];
