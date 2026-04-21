export type DocumentComment = {
  id: string;
  documentId: string;
  text: string;
  authorId: string;
  authorName: string;
  authorRole: 'owner' | 'viewer';
  sectionLabel?: string;
  resolved: boolean;
  createdAt: string;
};

export type CreateCommentInput = {
  documentId: string;
  sessionId: string;
  text: string;
  sectionLabel?: string;
};
