export interface ActivityNote {
  id: string;
  customerId: string;
  eventId: string;
  authorUserId: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  editedAt: string | null;
}

export interface CreateActivityNoteInput {
  actorUserId: string;
  body: string;
}

export interface UpdateActivityNoteInput {
  actorUserId: string;
  body: string;
}

export interface ArchiveActivityNoteInput {
  actorUserId: string;
}
