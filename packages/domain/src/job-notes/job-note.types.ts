export interface JobNote {
  id: string;
  customerId: string;
  projectId: string;
  authorUserId: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  editedAt: string | null;
}

export interface CreateJobNoteInput {
  actorUserId: string;
  body: string;
}

export interface UpdateJobNoteInput {
  actorUserId: string;
  body: string;
}

export interface ArchiveJobNoteInput {
  actorUserId: string;
}
