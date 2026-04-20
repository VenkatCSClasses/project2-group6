import { useEffect, useMemo, useRef, useState } from "react";
import { type YooptaContentValue } from "@yoopta/editor";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import "../App.css";
import { ApiError } from "./api/request";
import { CommentsPanel } from "./comments/commentsPanel";
import { CollaborationStatus } from "./collaboration/CollaborationStatus";
import { getCollaborationConfig } from "./collaboration/config";
import { RemotePresence } from "./collaboration/RemotePresence";
import type {
  ActiveSession,
  PresenceSnapshot,
  SessionMode,
  ViewerInvite,
} from "./collaboration/types";
import { CollaborativeEditorShell } from "./components/CollaborativeEditorShell";
import { assignViewer, getDocument, saveDocument } from "./documents/documentApi";
import type { EditorDocument } from "./documents/types";
import {
  claimSession,
  generateViewerInvite,
  getPresence,
  getViewerInvite,
  heartbeatSession,
  releaseSession,
} from "./session/sessionApi";

function InviteJoinScreen({
  documentId,
  errorMessage,
  isJoining,
  onJoin,
}: {
  documentId: string;
  errorMessage: string | null;
  isJoining: boolean;
  onJoin: (displayName: string) => Promise<void>;
}) {
  const [displayName, setDisplayName] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onJoin(displayName);
  }

  return (
    <main className="app-shell">
      <section className="hero-panel join-shell">
        <div>
          <p className="eyebrow">Invite Link</p>
          <h1>Join The Document</h1>
          <p className="hero-copy">
            This invite link opens the reviewer slot for document {documentId}. Enter
            your name to join in read-only mode and leave comments.
          </p>
          <p className="join-note">Reviewers can comment, but only the owner can edit.</p>
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

          {errorMessage ? <p className="join-error">{errorMessage}</p> : null}

          <button className="primary-button" disabled={isJoining} type="submit">
            {isJoining ? "Joining..." : "Join workspace"}
          </button>
        </form>
      </section>
    </main>
  );
}

function MissingAccess({ message }: { message: string }) {
  return (
    <main style={{ padding: "32px" }}>
      <h1>Unable To Open Document</h1>
      <p>{message}</p>
    </main>
  );
}

export default function EditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [document, setDocument] = useState<EditorDocument | null>(null);
  const [session, setSession] = useState<ActiveSession | null>(null);
  const [presence, setPresence] = useState<PresenceSnapshot | null>(null);
  const [sessionMode, setSessionMode] = useState<SessionMode>("edit");
  const [viewerUsernameInput, setViewerUsernameInput] = useState("");
  const [viewerInvite, setViewerInvite] = useState<ViewerInvite | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteFeedback, setInviteFeedback] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [isGeneratingInvite, setIsGeneratingInvite] = useState(false);
  const config = useMemo(() => getCollaborationConfig(), []);
  const releaseRef = useRef<ActiveSession | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const documentId = id ?? "";
  const inviteToken = useMemo(
    () => new URLSearchParams(location.search).get("invite")?.trim() || null,
    [location.search],
  );
  const inviteLink = viewerInvite?.token
    ? `${window.location.origin}/editor/${documentId}?invite=${viewerInvite.token}`
    : null;

  useEffect(() => {
    releaseRef.current = session;
  }, [session]);

  useEffect(() => {
    return () => {
      if (releaseRef.current) {
        void releaseSession(releaseRef.current.documentId, releaseRef.current.sessionId);
      }

      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!documentId || inviteToken) {
      return;
    }

    const username = localStorage.getItem("username");

    if (!username) {
      navigate("/login");
      return;
    }

    const initialize = async () => {
      try {
        const activeSession = await claimSession({
          documentId,
          username,
        });
        setSession(activeSession);
        setSessionMode(activeSession.accessLevel === "owner" ? "edit" : "view");

        const nextDocument = await getDocument(documentId, activeSession.sessionId);
        setDocument(nextDocument);
        setPresence(nextDocument.presence);
        setViewerUsernameInput(nextDocument.viewerUsername || "");
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Unable to open document.");
      }
    };

    void initialize();
  }, [documentId, inviteToken, navigate]);

  useEffect(() => {
    if (!session) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void heartbeatSession(session.documentId, session.sessionId).catch((error) => {
        if (error instanceof ApiError && error.status === 401) {
          setErrorMessage("Your session expired. Open the document again.");
          setSession(null);
          setDocument(null);
          setPresence(null);
        }
      });
    }, config.heartbeatIntervalMs);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [config.heartbeatIntervalMs, session]);

  useEffect(() => {
    if (!session) {
      return;
    }

    const loadPresence = async () => {
      try {
        const nextPresence = await getPresence(session.documentId, session.sessionId);
        setPresence(nextPresence);
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          setErrorMessage("Your session expired. Open the document again.");
          setSession(null);
          setDocument(null);
          setPresence(null);
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
    if (!session || session.accessLevel !== "viewer") {
      return;
    }

    const loadDocument = async () => {
      try {
        const nextDocument = await getDocument(session.documentId, session.sessionId);
        setDocument(nextDocument);
        setPresence(nextDocument.presence);
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          setErrorMessage("Your viewer session expired. Open the invite again.");
          setSession(null);
          setDocument(null);
          setPresence(null);
        }
      }
    };

    void loadDocument();
    const intervalId = window.setInterval(() => {
      void loadDocument();
    }, config.documentPollIntervalMs);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [config.documentPollIntervalMs, session]);

  useEffect(() => {
    if (!session || session.accessLevel !== "owner") {
      setViewerInvite(null);
      return;
    }

    const loadInvite = async () => {
      try {
        const nextInvite = await getViewerInvite(session.documentId, session.sessionId);
        setViewerInvite(nextInvite);
        setInviteError(null);
      } catch (error) {
        setInviteError(error instanceof Error ? error.message : "Unable to load invite link.");
      }
    };

    void loadInvite();
  }, [session]);

  async function handleInviteJoin(displayName: string) {
    if (!documentId || !inviteToken) {
      return;
    }

    if (!displayName.trim()) {
      setJoinError("Enter a name before joining.");
      return;
    }

    setIsJoining(true);
    setJoinError(null);

    try {
      const activeSession = await claimSession({
        documentId,
        accessLevel: "viewer",
        displayName: displayName.trim(),
        inviteToken,
      });

      setSession(activeSession);
      setSessionMode("view");
      const nextDocument = await getDocument(documentId, activeSession.sessionId);
      setDocument(nextDocument);
      setPresence(nextDocument.presence);
      setErrorMessage(null);
    } catch (error) {
      setJoinError(error instanceof Error ? error.message : "Unable to join the document.");
    } finally {
      setIsJoining(false);
    }
  }

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
        setErrorMessage("Your owner session expired. Open the document again.");
      }
    }
  }

  function queueSave(nextContent: YooptaContentValue) {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(() => {
      void handleSave(nextContent);
    }, 400);
  }

  async function handleAssignViewer() {
    if (!session || !document) {
      return;
    }

    try {
      const nextDocument = await assignViewer(
        document.id,
        session.sessionId,
        viewerUsernameInput.trim() || null,
      );
      setDocument(nextDocument);
      setPresence(nextDocument.presence);
      setViewerUsernameInput(nextDocument.viewerUsername || "");
      setInviteFeedback("Assigned viewer updated.");
      setInviteError(null);
    } catch (error) {
      setInviteError(
        error instanceof Error ? error.message : "Unable to assign the viewer.",
      );
    }
  }

  async function handleGenerateInvite() {
    if (!session || session.accessLevel !== "owner") {
      return;
    }

    setIsGeneratingInvite(true);
    setInviteError(null);
    setInviteFeedback(null);

    try {
      const nextInvite = await generateViewerInvite(session.documentId, session.sessionId);
      setViewerInvite(nextInvite);
      setInviteFeedback("Invite link ready to share.");
    } catch (error) {
      setInviteError(
        error instanceof Error ? error.message : "Unable to generate an invite link.",
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
      await navigator.clipboard.writeText(inviteLink);
      setInviteFeedback("Invite link copied.");
      setInviteError(null);
    } catch (error) {
      setInviteError(
        error instanceof Error ? error.message : "Unable to copy the invite link.",
      );
    }
  }

  if (!documentId) {
    return <MissingAccess message="Missing document id." />;
  }

  if (inviteToken && (!session || !document || !presence)) {
    return (
      <InviteJoinScreen
        documentId={documentId}
        errorMessage={joinError}
        isJoining={isJoining}
        onJoin={handleInviteJoin}
      />
    );
  }

  if (errorMessage) {
    return <MissingAccess message={errorMessage} />;
  }

  if (!session || !document || !presence) {
    return (
      <main style={{ padding: "32px" }}>
        <h1>Loading document...</h1>
      </main>
    );
  }

  const isOwner = session.accessLevel === "owner";
  const canEdit = isOwner && sessionMode === "edit";
  const editorRevision =
    session.accessLevel === "viewer" ? `${document.id}:${document.updatedAt}` : document.id;

  return (
    <main className="app-shell">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">Collaboration</p>
          <h1>{document.title}</h1>
          <p className="hero-copy">
            Owners keep edit permissions. Reviewers can join through an assigned
            account or a shareable invite link, and comments stay available in read-only mode.
          </p>
        </div>

        <div className="role-controls">
          <div className="role-summary">
            <span className="summary-pill">
              {isOwner ? "Owner access" : "Viewer access"}
            </span>
            <span className="summary-pill">
              {presence.viewerConnected ? "Viewer slot in use" : "Viewer slot open"}
            </span>
          </div>

          {isOwner ? (
            <>
              <div className="access-toggle">
                <button
                  type="button"
                  className={sessionMode === "edit" ? "toggle-active" : ""}
                  onClick={() => setSessionMode("edit")}
                >
                  Edit mode
                </button>
                <button
                  type="button"
                  className={sessionMode === "view" ? "toggle-active" : ""}
                  onClick={() => setSessionMode("view")}
                >
                  Viewer mode
                </button>
              </div>

              <label className="invite-link-field">
                Assigned viewer username
                <input
                  value={viewerUsernameInput}
                  onChange={(event) => setViewerUsernameInput(event.target.value)}
                  placeholder="editor1"
                />
              </label>
              <button className="secondary-button" onClick={() => void handleAssignViewer()}>
                Save assigned viewer
              </button>

              <div className="invite-card">
                <div>
                  <p className="eyebrow">Invite Link</p>
                  <h2>Allow one reviewer in</h2>
                  <p className="panel-note">
                    Generate a shareable link for this document. The link unlocks the
                    active viewer slot for a guest reviewer.
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
                      ? "Generating..."
                      : viewerInvite?.token
                        ? "Regenerate link"
                        : "Create invite link"}
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
              </div>

              {inviteFeedback ? <p className="invite-feedback">{inviteFeedback}</p> : null}
              {inviteError ? <p className="join-error">{inviteError}</p> : null}
            </>
          ) : (
            <p className="panel-note">
              You are in viewer mode. Comments remain enabled while editing stays locked to the owner.
            </p>
          )}
        </div>
      </section>

      <section className="workspace-grid">
        <section className="editor-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Draft</p>
              <h2>{canEdit ? "Owner editing" : "Read-only view"}</h2>
            </div>
            <span className={`mode-pill ${canEdit ? "is-live" : "is-local"}`}>
              {canEdit ? "Can edit" : "Read only"}
            </span>
          </div>

          <CollaborativeEditorShell
            key={editorRevision}
            documentId={document.id}
            currentUser={{
              id: session.sessionId,
              name: session.displayName,
              color: isOwner ? "#0f766e" : "#2563eb",
            }}
            websocketUrl={config.websocketUrl}
            savedContent={document.content}
            readOnly={!canEdit}
            onChange={canEdit ? queueSave : undefined}
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
