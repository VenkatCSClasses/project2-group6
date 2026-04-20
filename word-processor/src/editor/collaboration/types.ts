export type AccessLevel = 'owner' | 'viewer';
export type SessionMode = 'edit' | 'view';

export type ActiveSession = {
  sessionId: string;
  accessLevel: AccessLevel;
  displayName: string;
  ownerName: string;
  documentId: string;
};

export type PresenceSnapshot = {
  ownerName: string;
  ownerConnected: boolean;
  viewerName: string | null;
  viewerConnected: boolean;
};

export type ClaimSessionInput = {
  documentId: string;
  displayName: string;
  accessLevel: AccessLevel;
  ownerKey?: string;
  requestedSessionId?: string;
};
