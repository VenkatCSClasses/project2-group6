import { useEffect, useMemo, useRef, useState } from 'react';
import { type YooptaContentValue } from '@yoopta/editor';
import './App.css';
import { ApiError } from './editor/api/request';
import { CommentsPanel } from './editor/comments/commentsPanel';
import { CollaborationStatus } from './editor/collaboration/CollaborationStatus';
import { getCollaborationConfig } from './editor/collaboration/config';
import { RemotePresence } from './editor/collaboration/RemotePresence';
import type {
  AccessLevel,
  ActiveSession,
  PresenceSnapshot,
  SessionMode,
  ViewerInvite,
} from './editor/collaboration/types';
import { CollaborativeEditorShell } from './editor/components/CollaborativeEditorShell';
import { getDocument, saveDocument } from './editor/documents/documentApi';
import type { EditorDocument } from './editor/documents/types';
import {
  claimSession,
  generateViewerInvite,
  getPresence,
  getViewerInvite,
  heartbeatSession,
  releaseSession,
  releaseSessionBeacon,
} from './editor/session/sessionApi';

const DEFAULT_DOCUMENT_ID = 'city-council-feature';

function readJoinContext() {
  const searchParams = new URLSearchParams(window.location.search);
  const documentId = searchParams.get('document')?.trim() || DEFAULT_DOCUMENT_ID;
  const inviteToken = searchParams.get('invite')?.trim() || null;

  return { documentId, inviteToken };
}

function buildInviteUrl(documentId: string, inviteToken: string) {
  const inviteUrl = new URL(window.location.href);
  inviteUrl.search = '';
  inviteUrl.searchParams.set('document', documentId);
  inviteUrl.searchParams.set('invite', inviteToken);

  return inviteUrl.toString();
}

function JoinWorkspace({
  documentId,
  hasViewerInvite,
  joinError,
  isJoining,
  onJoin,
}: {
  documentId: string;
  hasViewerInvite: boolean;
  joinError: string | null;
  isJoining: boolean;
  onJoin: (payload: {
    displayName: string;
    accessLevel: AccessLevel;
    ownerKey?: string;
  }) => Promise<void>;
}) {
  const [displayName, setDisplayName] = useState('');
  const [ownerKey, setOwnerKey] = useState('');
  const accessLevel: AccessLevel = hasViewerInvite ? 'viewer' : 'owner';

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onJoin({
      displayName,
      accessLevel,
      ownerKey: accessLevel === 'owner' ? ownerKey : undefined,
    });
  }

  return (
    <main className="app-shell">
      <section className="hero-panel join-shell">
        <div>
          <p className="eyebrow">Remote Access</p>
          <h1>Join The Document</h1>
          <p className="hero-copy">
            {hasViewerInvite
              ? 'This invite link opens the active reviewer slot. Enter your name to join the draft in read-only mode and leave comments.'
              : 'Only the file creator keeps owner permissions. Generate an invite link from the workspace when you want a reviewer to collaborate.'}
          </p>
          <p className="join-note">Document: {documentId}</p>
        </div>

        <form className="join-form" onSubmit={handleSubmit}>
          <label>
            Your name
            <input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="Name shown in comments and presence"
            />
          </label>

          <div className="access-toggle">
            <button
              type="button"
              className={accessLevel === 'viewer' ? 'toggle-active' : ''}
              disabled={!hasViewerInvite}
            >
              {hasViewerInvite ? 'Join as viewer' : 'Viewer invite required'}
            </button>
            <button
              type="button"
              className={accessLevel === 'owner' ? 'toggle-active' : ''}
              disabled={hasViewerInvite}
            >
              Join as owner
            </button>
          </div>

          {accessLevel === 'owner' ? (
            <label>
              Owner key
              <input
                value={ownerKey}
                onChange={(event) => setOwnerKey(event.target.value)}
                placeholder="Owner secret"
                type="password"
              />
            </label>
          ) : null}

          {joinError ? <p className="join-error">{joinError}</p> : null}

          <button className="primary-button" disabled={isJoining} type="submit">
            {isJoining ? 'Joining...' : 'Join workspace'}
          </button>
        </form>
      </section>
    </main>
  );
}

export default function App() {
  const [document, setDocument] = useState<EditorDocument | null>(null);
  const [session, setSession] = useState<ActiveSession | null>(null);
  const [sessionMode, setSessionMode] = useState<SessionMode>('edit');
  const [presence, setPresence] = useState<PresenceSnapshot | null>(null);
  const [viewerInvite, setViewerInvite] = useState<ViewerInvite | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteFeedback, setInviteFeedback] = useState<string | null>(null);
  const [isGeneratingInvite, setIsGeneratingInvite] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const config = useMemo(() => getCollaborationConfig(), []);
  const joinContext = useMemo(() => readJoinContext(), []);
  const releaseRef = useRef<ActiveSession | null>(null);
  const inviteLink = viewerInvite?.token
    ? buildInviteUrl(session?.documentId ?? joinContext.documentId, viewerInvite.token)
    : null;

  useEffect(() => {
    releaseRef.current = session;
  }, [session]);

  function handleSessionExpired(message: string) {
    setJoinError(message);
    setSession(null);
    setDocument(null);
    setPresence(null);
    setViewerInvite(null);
    setInviteError(null);
    setInviteFeedback(null);
  }

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (releaseRef.current) {
        releaseSessionBeacon(releaseRef.current.documentId, releaseRef.current.sessionId);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  async function loadDocument(activeSession: ActiveSession) {
    const loadedDocument = await getDocument(
      activeSession.documentId,
      activeSession.sessionId,
    );
    setDocument(loadedDocument);
    setPresence(loadedDocument.presence);
  }

  async function handleJoin(payload: {
    displayName: string;
    accessLevel: AccessLevel;
    ownerKey?: string;
  }) {
    if (!payload.displayName.trim()) {
      setJoinError('Enter a name before joining the workspace.');
      return;
    }

    if (payload.accessLevel === 'viewer' && !joinContext.inviteToken) {
      setJoinError('Open the invite link shared by the owner to join as a viewer.');
      return;
    }

    setIsJoining(true);
    setJoinError(null);

    try {
      const activeSession = await claimSession({
        documentId: joinContext.documentId,
        displayName: payload.displayName.trim(),
        accessLevel: payload.accessLevel,
        ownerKey: payload.ownerKey,
        inviteToken: payload.accessLevel === 'viewer' ? joinContext.inviteToken ?? undefined : undefined,
      });

      setSession(activeSession);
      setSessionMode(activeSession.accessLevel === 'owner' ? 'edit' : 'view');
      await loadDocument(activeSession);
    } catch (error) {
      setJoinError(error instanceof Error ? error.message : 'Unable to join.');
    } finally {
      setIsJoining(false);
    }
  }

  useEffect(() => {
    if (!session) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      void heartbeatSession(session.documentId, session.sessionId).catch((error) => {
        if (error instanceof ApiError && error.status === 401) {
          handleSessionExpired('Your session expired. Join the workspace again.');
        }
      });
    }, config.heartbeatIntervalMs);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [config.heartbeatIntervalMs, session]);

  useEffect(() => {
    if (!session) {
      return undefined;
    }

    const loadPresence = async () => {
      try {
        const nextPresence = await getPresence(session.documentId, session.sessionId);
        setPresence(nextPresence);
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          handleSessionExpired('Your session expired. Join the workspace again.');
        }
      }
    };

    void loadPresence();
    const intervalId = window.setInterval(() => {
      void loadPresence();
    }, config.presencePollIntervalMs);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [config.presencePollIntervalMs, session]);

  useEffect(() => {
    if (!session || session.accessLevel === 'owner') {
      return undefined;
    }

    const reloadDocument = async () => {
      try {
        const nextDocument = await getDocument(session.documentId, session.sessionId);
        setDocument(nextDocument);
        setPresence(nextDocument.presence);
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          handleSessionExpired('Your viewer session expired. Join the workspace again.');
        }
      }
    };

    void reloadDocument();
    const intervalId = window.setInterval(() => {
      void reloadDocument();
    }, config.documentPollIntervalMs);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [config.documentPollIntervalMs, session]);

  useEffect(() => {
    return () => {
      if (releaseRef.current) {
        void releaseSession(
          releaseRef.current.documentId,
          releaseRef.current.sessionId,
        );
      }
    };
  }, []);

  useEffect(() => {
    if (!session || session.accessLevel !== 'owner') {
      setViewerInvite(null);
      setInviteError(null);
      setInviteFeedback(null);
      return undefined;
    }

    let isMounted = true;

    const loadInvite = async () => {
      try {
        const nextInvite = await getViewerInvite(session.documentId, session.sessionId);
        if (isMounted) {
          setViewerInvite(nextInvite);
          setInviteError(null);
        }
      } catch (error) {
        if (isMounted) {
          setInviteError(
            error instanceof Error ? error.message : 'Unable to load the invite link.',
          );
        }
      }
    };

    void loadInvite();

    return () => {
      isMounted = false;
    };
  }, [session]);

  async function handleSave(nextContent: YooptaContentValue) {
    if (!session) {
      return;
    }

    try {
      const savedDocument = await saveDocument({
        documentId: session.documentId,
        content: nextContent,
        sessionId: session.sessionId,
      });

      setDocument(savedDocument);
      setPresence(savedDocument.presence);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        handleSessionExpired('Your owner session is no longer active. Join again.');
      }
    }
  }

  async function handleGenerateInvite() {
    if (!session || session.accessLevel !== 'owner') {
      return;
    }

    setIsGeneratingInvite(true);
    setInviteError(null);
    setInviteFeedback(null);

    try {
      const nextInvite = await generateViewerInvite(session.documentId, session.sessionId);
      setViewerInvite(nextInvite);
      setInviteFeedback('Invite link ready to share.');
    } catch (error) {
      setInviteError(
        error instanceof Error ? error.message : 'Unable to generate an invite link.',
      );
    } finally {
      setIsGeneratingInvite(false);
    }
  }

  async function handleCopyInvite() {
    if (!inviteLink) {
      return;
    }

    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error('Clipboard access is unavailable.');
      }

      await navigator.clipboard.writeText(inviteLink);
      setInviteFeedback('Invite link copied.');
      setInviteError(null);
    } catch (error) {
      setInviteError(
        error instanceof Error ? error.message : 'Unable to copy the invite link.',
      );
    }
  }

  if (!session || !document || !presence) {
    return (
      <JoinWorkspace
        documentId={joinContext.documentId}
        hasViewerInvite={Boolean(joinContext.inviteToken)}
        joinError={joinError}
        isJoining={isJoining}
        onJoin={handleJoin}
      />
    );
  }

  const isOwner = session.accessLevel === 'owner';
  const canEdit = isOwner && sessionMode === 'edit';

  return (
    <main className="app-shell">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">Remote Collaboration</p>
          <h1>{document.title}</h1>
          <p className="hero-copy">
            The file creator stays the owner. One viewer slot is available for a
            remote person to read the draft and leave comments.
          </p>
        </div>

        <div className="role-controls">
          <div className="role-summary">
            <span className="summary-pill">
              {isOwner ? 'Owner access' : 'Viewer access'}
            </span>
            <span className="summary-pill">
              {presence.viewerConnected ? 'Viewer slot in use' : 'Viewer slot open'}
            </span>
          </div>

          {isOwner ? (
            <>
              <div className="access-toggle">
                <button
                  type="button"
                  className={sessionMode === 'edit' ? 'toggle-active' : ''}
                  onClick={() => setSessionMode('edit')}
                >
                  Edit mode
                </button>
                <button
                  type="button"
                  className={sessionMode === 'view' ? 'toggle-active' : ''}
                  onClick={() => setSessionMode('view')}
                >
                  Viewer mode
                </button>
              </div>

              <div className="invite-card">
                <div>
                  <p className="eyebrow">Invite Link</p>
                  <h2>Allow one reviewer in</h2>
                  <p className="panel-note">
                    Generate a shareable link for this document. The link unlocks the
                    single viewer slot and keeps the reviewer read-only.
                  </p>
                </div>

                <div className="invite-actions">
                  <button
                    className="secondary-button"
                    disabled={isGeneratingInvite}
                    onClick={() => void handleGenerateInvite()}
                    type="button"
                  >
                    {isGeneratingInvite
                      ? 'Generating...'
                      : viewerInvite?.token
                        ? 'Regenerate link'
                        : 'Create invite link'}
                  </button>
                  <button
                    className="primary-button"
                    disabled={!inviteLink}
                    onClick={() => void handleCopyInvite()}
                    type="button"
                  >
                    Copy link
                  </button>
                </div>

                {inviteLink ? (
                  <label className="invite-link-field">
                    Shareable link
                    <input readOnly value={inviteLink} />
                  </label>
                ) : null}

                {viewerInvite?.createdAt ? (
                  <p className="panel-note">
                    Generated {new Date(viewerInvite.createdAt).toLocaleString()}
                  </p>
                ) : null}

                {inviteFeedback ? <p className="invite-feedback">{inviteFeedback}</p> : null}
                {inviteError ? <p className="join-error">{inviteError}</p> : null}
              </div>
            </>
          ) : (
            <p className="panel-note">
              You joined through a reviewer invite link. Comments stay enabled while
              editing remains locked to the file owner.
            </p>
          )}
        </div>
      </section>

      <section className="workspace-grid">
        <section className="editor-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Draft</p>
              <h2>{canEdit ? 'Owner editing' : 'Read-only view'}</h2>
            </div>
            <span className={`mode-pill ${canEdit ? 'is-live' : 'is-local'}`}>
              {canEdit ? 'Can edit' : 'Read only'}
            </span>
          </div>

          <CollaborativeEditorShell
            documentId={document.id}
            currentUser={{
              id: session.sessionId,
              name: session.displayName,
              color: isOwner ? '#0f766e' : '#2563eb',
            }}
            websocketUrl={config.websocketUrl}
            savedContent={document.content}
            readOnly={!canEdit}
            onChange={canEdit ? handleSave : undefined}
          />
        </section>

        <section className="sidebar">
          <CollaborationStatus
            accessLevel={session.accessLevel}
            sessionMode={sessionMode}
            ownerName={document.ownerName}
            viewerName={presence.viewerName}
            websocketUrl={config.websocketUrl}
            isRealtimeEnabled={config.isRealtimeEnabled}
            updatedAt={document.updatedAt}
          />
          <RemotePresence session={session} presence={presence} />
          <CommentsPanel
            documentId={document.id}
            sessionId={session.sessionId}
            accessLevel={session.accessLevel}
            canResolveComments={isOwner}
          />
        </section>
      </section>
    </main>
  );
}
