export type CommentAnchor = {
  blockId: string;
  anchor: { path: number[]; offset: number };
  focus: { path: number[]; offset: number };
};

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
  selectedText?: string;
  commentAnchor?: CommentAnchor;
};

export type CreateCommentInput = {
  documentId: string;
  sessionId: string;
  text: string;
  sectionLabel?: string;
  selectedText?: string;
  commentAnchor?: CommentAnchor;
};
