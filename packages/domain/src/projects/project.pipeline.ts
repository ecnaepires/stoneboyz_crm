import type { AppointmentType } from '../scheduling/scheduled-event.types.js';
import type { ProjectStatus } from './project.constants.js';

export const PIPELINE_STAGE_VALUES = [
  'new',
  'deposit',
  'template',
  'material',
  'fabrication',
  'install',
  'invoice',
  'done'
] as const;

export type PipelineStage = (typeof PIPELINE_STAGE_VALUES)[number];

export const STAGE_ORDER: Record<PipelineStage, number> = PIPELINE_STAGE_VALUES.reduce(
  (acc, stage, index) => ({ ...acc, [stage]: index }),
  {} as Record<PipelineStage, number>
);

const APPOINTMENT_STAGE_MAP: Partial<Record<AppointmentType | 'cut', PipelineStage>> = {
  deposit: 'deposit',
  template: 'template',
  material: 'material',
  fabrication: 'fabrication',
  install: 'install',
  invoice: 'invoice'
};

export const stageFromAppointmentType = (
  appointmentType: AppointmentType | 'cut'
): PipelineStage | null => APPOINTMENT_STAGE_MAP[appointmentType] ?? null;

export const statusFromStage = (stage: PipelineStage): ProjectStatus => {
  if (stage === 'new') {
    return 'draft';
  }

  if (stage === 'done') {
    return 'completed';
  }

  return 'active';
};

export const isForward = (from: PipelineStage, to: PipelineStage): boolean =>
  STAGE_ORDER[to] > STAGE_ORDER[from];
