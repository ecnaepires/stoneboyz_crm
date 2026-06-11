import type { PipelineStage } from '@stoneboyz/domain';

export const SCHEDULE_APPOINTMENT_TYPES = [
  'template',
  'deposit',
  'material',
  'cut',
  'fabrication',
  'install',
  'invoice',
  'repair',
  'other',
] as const;

export type ScheduleAppointmentType = (typeof SCHEDULE_APPOINTMENT_TYPES)[number];

export type ScheduleDisplayType = 'day' | 'week' | 'range';
export type ScheduleEventType = 'appointment' | 'shop_job';
export type ScheduleStatus = 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
export type ScheduleColorBy = 'appointmentType' | 'status' | 'assignee';
export type ScheduleDisplayField =
  | 'projectTitle'
  | 'customerName'
  | 'address'
  | 'activityTitle'
  | 'time'
  | 'duration'
  | 'status'
  | 'assignees'
  | 'notes'
  | 'sqft';

const appointmentTypeSet = new Set<string>(SCHEDULE_APPOINTMENT_TYPES);

const NEXT_APPOINTMENT_BY_STAGE = {
  new: 'deposit',
  deposit: 'template',
  template: 'material',
  material: 'fabrication',
  fabrication: 'install',
  install: 'invoice',
  invoice: null,
  done: null,
} satisfies Record<PipelineStage, ScheduleAppointmentType | null>;

export const isScheduleAppointmentType = (value: string | undefined): value is ScheduleAppointmentType =>
  value !== undefined && appointmentTypeSet.has(value);

export const nextAppointmentTypeForPipelineStage = (stage: PipelineStage): ScheduleAppointmentType | null =>
  NEXT_APPOINTMENT_BY_STAGE[stage];

export const buildScheduleHref = ({
  date,
  customerId,
  projectId,
  appointmentType,
  view,
  displayType,
  rangeDays,
  eventTypes,
  appointmentTypes,
  statuses,
  assigneeIds,
  hideCompleted,
  displayFields,
  colorBy,
  wrapText,
  autoRefreshSeconds,
}: {
  date?: string | undefined;
  customerId?: string | undefined;
  projectId?: string | undefined;
  appointmentType?: ScheduleAppointmentType | undefined;
  view?: string | undefined;
  displayType?: ScheduleDisplayType | undefined;
  rangeDays?: number | undefined;
  eventTypes?: ScheduleEventType[] | undefined;
  appointmentTypes?: ScheduleAppointmentType[] | undefined;
  statuses?: ScheduleStatus[] | undefined;
  assigneeIds?: string[] | undefined;
  hideCompleted?: boolean | undefined;
  displayFields?: ScheduleDisplayField[] | undefined;
  colorBy?: ScheduleColorBy | undefined;
  wrapText?: boolean | undefined;
  autoRefreshSeconds?: number | null | undefined;
}) => {
  const params = new URLSearchParams();
  if (date) params.set('date', date);
  if (customerId) params.set('customerId', customerId);
  if (projectId) params.set('projectId', projectId);
  if (appointmentType) params.set('appointmentType', appointmentType);
  if (view) params.set('view', view);
  if (displayType) params.set('displayType', displayType);
  if (rangeDays) params.set('rangeDays', String(rangeDays));
  if (eventTypes?.length) params.set('eventTypes', eventTypes.join(','));
  if (appointmentTypes?.length) params.set('appointmentTypes', appointmentTypes.join(','));
  if (statuses?.length) params.set('statuses', statuses.join(','));
  if (assigneeIds?.length) params.set('assigneeIds', assigneeIds.join(','));
  if (hideCompleted !== undefined) params.set('hideCompleted', String(hideCompleted));
  if (displayFields?.length) params.set('displayFields', displayFields.join(','));
  if (colorBy) params.set('colorBy', colorBy);
  if (wrapText !== undefined) params.set('wrapText', String(wrapText));
  if (autoRefreshSeconds !== undefined && autoRefreshSeconds !== null) {
    params.set('autoRefreshSeconds', String(autoRefreshSeconds));
  }
  const query = params.toString();
  return query ? `/schedule?${query}` : '/schedule';
};
