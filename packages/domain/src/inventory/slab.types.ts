import type { SLAB_FINISH_VALUES, SLAB_QUALITY_GRADE_VALUES, SLAB_STATUS_VALUES } from './slab.constants.js';

export type SlabStatus = typeof SLAB_STATUS_VALUES[number];
export type SlabFinish = typeof SLAB_FINISH_VALUES[number];
export type SlabQualityGrade = typeof SLAB_QUALITY_GRADE_VALUES[number];

export interface Slab {
  id: string;
  parentSlabId: string | null;
  stoneType: string;
  finish: SlabFinish;
  qualityGrade: SlabQualityGrade;
  lengthIn: number;
  widthIn: number;
  thicknessCm: number;
  sqFt?: number;
  lotNumber: string | null;
  bundleNumber: string | null;
  warehouseLocation: string | null;
  costCents: number;
  imageUrls: string[];
  notes: string | null;
  status: SlabStatus;
  archivedAt: string | null;
  archivedByUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSlabInput {
  actorUserId: string;
  stoneType: string;
  finish: SlabFinish;
  qualityGrade: SlabQualityGrade;
  lengthIn: number;
  widthIn: number;
  thicknessCm: number;
  lotNumber?: string | undefined;
  bundleNumber?: string | undefined;
  warehouseLocation?: string | undefined;
  costCents?: number | undefined;
  imageUrls?: string[] | undefined;
  notes?: string | undefined;
}

export interface UpdateSlabInput {
  actorUserId: string;
  stoneType?: string | undefined;
  finish?: SlabFinish | undefined;
  qualityGrade?: SlabQualityGrade | undefined;
  lengthIn?: number | undefined;
  widthIn?: number | undefined;
  thicknessCm?: number | undefined;
  lotNumber?: string | null | undefined;
  bundleNumber?: string | null | undefined;
  warehouseLocation?: string | null | undefined;
  costCents?: number | undefined;
  imageUrls?: string[] | undefined;
  notes?: string | null | undefined;
}

export interface CutSlabInput {
  actorUserId: string;
  remnants?: CreateSlabInput[] | undefined;
}

export interface ArchiveSlabInput {
  actorUserId: string;
}

export interface ListSlabsInput {
  cursor?: string | undefined;
  limit?: number | undefined;
  status?: SlabStatus | undefined;
  stoneType?: string | undefined;
  finish?: SlabFinish | undefined;
}

export interface AttachProjectSlabInput {
  actorUserId: string;
  slabId: string;
  notes?: string | undefined;
}

export interface ProjectSlab {
  id: string;
  projectId: string;
  slabId: string;
  consumedByUserId: string | null;
  consumedAt: string | null;
  notes: string | null;
  createdAt: string;
}
