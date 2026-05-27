export interface Phase {
  id: string;
  customerId: string;
  projectId: string;
  phaseNumber: number;
  name: string;
  archivedAt: string | null;
  archivedByUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePhaseInput {
  actorUserId: string;
  name: string;
}

export interface UpdatePhaseInput {
  actorUserId: string;
  name?: string | undefined;
}

export interface ArchivePhaseInput {
  actorUserId: string;
}
