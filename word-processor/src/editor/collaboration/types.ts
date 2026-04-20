export type AccessLevel = "owner" | "viewer";
export type SessionMode = "edit" | "view";

export type ActiveSession = {
  sessionId: string;
  accessLevel: AccessLevel;
  displayName: string;
  ownerName: string;
  documentId: string;
};

export type PresenceSnapshot = {
  ownerName: string;
  viewerName: string | null;
  ownerConnected: boolean;
  viewerConnected: boolean;
};

export type ViewerInvite = {
  documentId: string;
  token: string | null;
  createdAt: string | null;
  lastUsedAt: string | null;
};

export type ClaimSessionInput = {
  documentId: string;
  username?: string;
  displayName?: string;
  accessLevel?: AccessLevel;
  inviteToken?: string;
  requestedSessionId?: string;
};
