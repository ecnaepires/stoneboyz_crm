export interface QuoteNote {
  id: string;
  customerId: string;
  quoteId: string;
  authorUserId: string;
  body: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  editedAt: string | null;
}

export interface CreateQuoteNoteInput {
  actorUserId: string;
  body: string;
  isPublic?: boolean | undefined;
}

export interface UpdateQuoteNoteInput {
  actorUserId: string;
  body: string;
}

export interface ArchiveQuoteNoteInput {
  actorUserId: string;
}
