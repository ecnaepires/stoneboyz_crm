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
}: {
  date?: string | undefined;
  customerId?: string | undefined;
  projectId?: string | undefined;
  appointmentType?: ScheduleAppointmentType | undefined;
}) => {
  const params = new URLSearchParams();
  if (date) params.set('date', date);
  if (customerId) params.set('customerId', customerId);
  if (projectId) params.set('projectId', projectId);
  if (appointmentType) params.set('appointmentType', appointmentType);
  const query = params.toString();
  return query ? `/schedule?${query}` : '/schedule';
};
