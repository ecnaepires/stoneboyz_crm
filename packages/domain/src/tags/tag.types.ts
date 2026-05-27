export interface Tag {
  id: string;
  name: string;
  color: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTagInput {
  name: string;
  color?: string | undefined;
}

export interface UpdateTagInput {
  actorUserId: string;
  name?: string | undefined;
  color?: string | null | undefined;
}

export interface ArchiveTagInput {
  actorUserId: string;
}

export interface ListTagsInput {
  includeArchived?: boolean | undefined;
}
