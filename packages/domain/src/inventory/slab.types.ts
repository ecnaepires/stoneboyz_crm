import type {
  DAMAGE_MARK_SEVERITY_VALUES,
  DAMAGE_MARK_TYPE_VALUES,
  SLAB_AVAILABILITY_VALUES,
  SLAB_CONDITION_VALUES,
  SLAB_FINISH_VALUES,
  SLAB_KIND_VALUES,
  SLAB_OWNERSHIP_VALUES,
  SLAB_QUALITY_GRADE_VALUES,
  SLAB_STATUS_VALUES
} from './slab.constants.js';

export type SlabStatus = typeof SLAB_STATUS_VALUES[number];
export type SlabKind = typeof SLAB_KIND_VALUES[number];
export type SlabAvailability = typeof SLAB_AVAILABILITY_VALUES[number];
export type SlabOwnership = typeof SLAB_OWNERSHIP_VALUES[number];
export type SlabCondition = typeof SLAB_CONDITION_VALUES[number];
export type SlabFinish = typeof SLAB_FINISH_VALUES[number];
export type SlabQualityGrade = typeof SLAB_QUALITY_GRADE_VALUES[number];
export type DamageMarkType = typeof DAMAGE_MARK_TYPE_VALUES[number];
export type DamageMarkSeverity = typeof DAMAGE_MARK_SEVERITY_VALUES[number];

export interface Slab {
  id: string;
  parentSlabId: string | null;
  materialColorId: string | null;
  storageLocationId: string | null;
  inventoryReceiptId: string | null;
  tagCode: string | null;
  kind: SlabKind;
  availability: SlabAvailability;
  ownership: SlabOwnership;
  condition: SlabCondition;
  holdReason: string | null;
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
  materialColorId?: string | null | undefined;
  storageLocationId?: string | null | undefined;
  inventoryReceiptId?: string | null | undefined;
  tagCode?: string | undefined;
  kind?: SlabKind | undefined;
  availability?: SlabAvailability | undefined;
  ownership?: SlabOwnership | undefined;
  condition?: SlabCondition | undefined;
  holdReason?: string | null | undefined;
  lotNumber?: string | undefined;
  bundleNumber?: string | undefined;
  warehouseLocation?: string | undefined;
  costCents?: number | undefined;
  imageUrls?: string[] | undefined;
  notes?: string | undefined;
}

export interface UpdateSlabInput {
  actorUserId: string;
  materialColorId?: string | null | undefined;
  storageLocationId?: string | null | undefined;
  inventoryReceiptId?: string | null | undefined;
  tagCode?: string | undefined;
  kind?: SlabKind | undefined;
  availability?: SlabAvailability | undefined;
  ownership?: SlabOwnership | undefined;
  condition?: SlabCondition | undefined;
  holdReason?: string | null | undefined;
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
  kind?: SlabKind | undefined;
  availability?: SlabAvailability | undefined;
  ownership?: SlabOwnership | undefined;
  condition?: SlabCondition | undefined;
  materialColorId?: string | undefined;
  storageLocationId?: string | undefined;
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

export interface DamageMarkShape {
  kind: 'circle' | 'polygon' | 'freehand';
  x?: number | undefined;
  y?: number | undefined;
  radius?: number | undefined;
  points?: Array<[number, number]> | undefined;
}

export interface DamageMark {
  id: string;
  slabId: string;
  photoId: string | null;
  type: DamageMarkType;
  severity: DamageMarkSeverity;
  shape: DamageMarkShape;
  note: string | null;
  createdByUserId: string | null;
  createdAt: string;
}

export interface CreateDamageMarkInput {
  actorUserId: string;
  photoId?: string | null | undefined;
  type: DamageMarkType;
  severity?: DamageMarkSeverity | undefined;
  shape: DamageMarkShape;
  note?: string | undefined;
}
