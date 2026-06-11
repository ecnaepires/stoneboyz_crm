export const ASSIGNEE_TYPE_VALUES = [
  'person',
  'team',
  'crew',
  'truck',
  'equipment',
  'machine',
  'department',
  'contractor'
] as const;

export type AssigneeType = (typeof ASSIGNEE_TYPE_VALUES)[number];
