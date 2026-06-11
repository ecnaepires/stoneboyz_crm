import type { PipelineStage } from '../projects/project.pipeline.js';
import type { AppointmentType } from '../scheduling/scheduled-event.types.js';

export interface Shop {
  id: string;
  slug: string;
  name: string;
  workDays: number[];
  counterDepthPresets: number[];
  createdAt: string;
  updatedAt: string;
}

export interface ActivityType {
  id: string;
  shopId: string;
  name: string;
  seedSlug: AppointmentType | null;
  color: string;
  pipelineStage: PipelineStage | null;
  countsSquareFootage: boolean;
  autoscheduleEligible: boolean;
  usesTemplateKind: boolean;
  defaultDurationMinutes: number;
  sortOrder: number;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListActivityTypesInput {
  includeArchived?: boolean | undefined;
}

export interface CreateActivityTypeInput {
  actorUserId: string;
  name: string;
  color: string;
  pipelineStage?: PipelineStage | null | undefined;
  countsSquareFootage?: boolean | undefined;
  autoscheduleEligible?: boolean | undefined;
  usesTemplateKind?: boolean | undefined;
  defaultDurationMinutes?: number | undefined;
  sortOrder?: number | undefined;
}

export interface UpdateActivityTypeInput {
  actorUserId: string;
  name?: string | undefined;
  color?: string | undefined;
  pipelineStage?: PipelineStage | null | undefined;
  countsSquareFootage?: boolean | undefined;
  autoscheduleEligible?: boolean | undefined;
  usesTemplateKind?: boolean | undefined;
  defaultDurationMinutes?: number | undefined;
  sortOrder?: number | undefined;
}

export interface ArchiveActivityTypeInput {
  actorUserId: string;
}
