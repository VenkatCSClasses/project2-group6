import { buildApiUrl } from '../collaboration/config';
import type {
  ActiveSession,
  ClaimSessionInput,
  PresenceSnapshot,
} from '../collaboration/types';
import { apiRequest } from '../api/request';

export async function claimSession(
  input: ClaimSessionInput,
): Promise<ActiveSession> {
  return apiRequest<ActiveSession>(`/api/documents/${input.documentId}/session/claim`, {
    method: 'POST',
    body: input,
  });
}

export async function heartbeatSession(
  documentId: string,
  sessionId: string,
): Promise<void> {
  return apiRequest<void>(`/api/documents/${documentId}/session/heartbeat`, {
    method: 'POST',
    body: { sessionId },
  });
}

export async function releaseSession(
  documentId: string,
  sessionId: string,
): Promise<void> {
  return apiRequest<void>(`/api/documents/${documentId}/session/release`, {
    method: 'POST',
    body: { sessionId },
  });
}

export function releaseSessionBeacon(documentId: string, sessionId: string) {
  const payload = JSON.stringify({ sessionId });
  const blob = new Blob([payload], { type: 'application/json' });

  navigator.sendBeacon(buildApiUrl(`/api/documents/${documentId}/session/release`), blob);
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
