import { apiRequest } from "../api/request";
import type { EditorDocument, SaveDocumentInput } from "./types";

export async function getDocument(
  documentId: string,
  sessionId: string,
): Promise<EditorDocument> {
  const searchParams = new URLSearchParams({ sessionId });

  return apiRequest<EditorDocument>(
    `/api/documents/${documentId}?${searchParams.toString()}`,
  );
}

export async function saveDocument({
  documentId,
  content,
  sessionId,
}: SaveDocumentInput): Promise<EditorDocument> {
  return apiRequest<EditorDocument>(`/api/documents/${documentId}`, {
    method: "PUT",
    body: { content, sessionId },
  });
}

export async function updateSharedViewers(
  documentId: string,
  sessionId: string,
  viewerUsernames: string[],
): Promise<EditorDocument> {
  return apiRequest<EditorDocument>(`/api/documents/${documentId}/viewers`, {
    method: "POST",
    body: { sessionId, viewerUsernames },
  });
}
