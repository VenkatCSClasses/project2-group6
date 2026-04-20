import { apiRequest } from '../api/request';
import type { CreateCommentInput, DocumentComment } from './types';

export async function listComments(
  documentId: string,
  sessionId: string,
): Promise<DocumentComment[]> {
  const searchParams = new URLSearchParams({ sessionId });

  return apiRequest<DocumentComment[]>(
    `/api/documents/${documentId}/comments?${searchParams.toString()}`,
  );
}

export async function createComment(
  payload: CreateCommentInput,
): Promise<DocumentComment> {
  return apiRequest<DocumentComment>(`/api/documents/${payload.documentId}/comments`, {
    method: 'POST',
    body: payload,
  });
}

export async function resolveComment(
  documentId: string,
  commentId: string,
  sessionId: string,
): Promise<void> {
  return apiRequest<void>(
    `/api/documents/${documentId}/comments/${commentId}/resolve`,
    {
      method: 'POST',
      body: { sessionId },
    },
  );
}
