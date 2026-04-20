import type {
  ActiveSession,
  ClaimSessionInput,
  PresenceSnapshot,
  ViewerInvite,
} from "../collaboration/types";
import { apiRequest } from "../api/request";

export async function claimSession(
  input: ClaimSessionInput,
): Promise<ActiveSession> {
  return apiRequest<ActiveSession>(`/api/documents/${input.documentId}/session/claim`, {
    method: "POST",
    body: input,
  });
}

export async function heartbeatSession(
  documentId: string,
  sessionId: string,
): Promise<void> {
  return apiRequest<void>(`/api/documents/${documentId}/session/heartbeat`, {
    method: "POST",
    body: { sessionId },
  });
}

export async function releaseSession(
  documentId: string,
  sessionId: string,
): Promise<void> {
  return apiRequest<void>(`/api/documents/${documentId}/session/release`, {
    method: "POST",
    body: { sessionId },
  });
}

export async function getPresence(
  documentId: string,
  sessionId: string,
): Promise<PresenceSnapshot> {
  const searchParams = new URLSearchParams({ sessionId });

  return apiRequest<PresenceSnapshot>(
    `/api/documents/${documentId}/session?${searchParams.toString()}`,
  );
}

export async function getViewerInvite(
  documentId: string,
  sessionId: string,
): Promise<ViewerInvite> {
  const searchParams = new URLSearchParams({ sessionId });

  return apiRequest<ViewerInvite>(
    `/api/documents/${documentId}/invite?${searchParams.toString()}`,
  );
}

export async function generateViewerInvite(
  documentId: string,
  sessionId: string,
): Promise<ViewerInvite> {
  return apiRequest<ViewerInvite>(`/api/documents/${documentId}/invite`, {
    method: "POST",
    body: { sessionId },
  });
}
