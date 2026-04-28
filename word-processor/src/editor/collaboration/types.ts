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
  viewerNames: string[];
  ownerConnected: boolean;
  viewerConnected: boolean;
  viewerCount: number;
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
