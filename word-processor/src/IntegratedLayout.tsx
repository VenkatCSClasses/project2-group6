import SearchSidebar from './SearchSidebar';
import './IntegratedStyles.css';
import Sources from './Sources';
import { useState, useEffect, useRef, useMemo, useCallback, type ReactNode } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import YooptaEditor, {
  createYooptaEditor,
  type RenderBlockProps,
  type SlateElement,
  type YooptaContentValue,
  type YooptaPlugin,
  useYooptaEditor,
  Blocks,
} from "@yoopta/editor";
import { WORD_PLUGINS } from "./plugins";
import { WORD_MARKS } from "./marks";
import { WordToolbar } from "./Toolbar";
import { SelectionBox } from "@yoopta/ui/selection-box";
import { BlockDndContext, SortableBlock, DragHandle } from "@yoopta/ui/block-dnd";
import {
  FloatingBlockActions,
  BlockOptions,
  SlashCommandMenu,
  ActionMenuList,
  useBlockActions,
} from "@yoopta/ui";
import { withMentions } from "@yoopta/mention";
import { applyTheme } from "@yoopta/themes-shadcn";
import "./App.css";
// @ts-expect-error - MentionDropdown types not properly exported
import { EmojiDropdown } from "@yoopta/themes-shadcn/emoji";
// @ts-expect-error - MentionDropdown types not properly exported
import { MentionDropdown } from "@yoopta/themes-shadcn/mention";
import { withEmoji } from "@yoopta/emoji";
import { ApiError } from "./editor/api/request";
import { CommentsPanel } from "./editor/comments/commentsPanel";
import { CollaborationStatus } from "./editor/collaboration/CollaborationStatus";
import { getCollaborationConfig } from "./editor/collaboration/config";
import { RemotePresence } from "./editor/collaboration/RemotePresence";
import type {
  ActiveSession,
  PresenceSnapshot,
} from "./editor/collaboration/types";
import { getDocument, saveDocument, updateSharedViewers } from "./editor/documents/documentApi";
import type { EditorDocument } from "./editor/documents/types";
import { getPublishDraftStorageKey } from "./publish";
import {
  claimSession,
  getPresence,
  heartbeatSession,
  releaseSession,
} from "./editor/session/sessionApi";
import { getViewerInvite, generateViewerInvite } from "./editor/session/sessionApi";

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
            This invite link opens shared read-only access for document {documentId}. Enter
            your name to join and leave comments while the owner keeps edit control.
          </p>
          <p className="join-note">Viewers can comment, but only the owner can edit.</p>
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

// Define the SourceEntry structure for MLA data
export type SourceEntry = {
  inlineCitation: string;
  studio: string;
  volume: string;
  journal: string;
  year: string;
  publisher: string;
  type: string;
  id: string;
  url: string;
  author?: string;
  title: string;
  website: string;
  dateAccessed: string;
};

// Floating block actions (plus button, drag handle)
function MyFloatingBlockActions() {
  const editor = useYooptaEditor();
  const { duplicateBlock, copyBlockLink, deleteBlock } = useBlockActions();
  const [blockOptionsOpen, setBlockOptionsOpen] = useState(false);
  const optionsButtonRef = useRef<HTMLButtonElement>(null);
  const turnIntoRef = useRef<HTMLButtonElement>(null);
  const [actionMenuOpen, setActionMenuOpen] = useState(false);

  const onActionMenuOpenChange = (open: boolean) => {
    setActionMenuOpen(open);
    if (!open) setBlockOptionsOpen(false);
  };

  return (
    <FloatingBlockActions frozen={blockOptionsOpen || actionMenuOpen}>
      {({ blockId }: { blockId?: string | null }) => (
        <>
          <FloatingBlockActions.Button
            onClick={() => {
              if (!blockId) return;
              const block = Blocks.getBlock(editor, { id: blockId });
              if (block) editor.insertBlock("Paragraph", { at: block.meta.order + 1, focus: true });
            }}>
            +
          </FloatingBlockActions.Button>

          <DragHandle blockId={blockId ?? null} asChild>
            <FloatingBlockActions.Button title="Drag to reorder">::</FloatingBlockActions.Button>
          </DragHandle>

          <FloatingBlockActions.Button
            ref={optionsButtonRef}
            title="Block options"
            onClick={() => setBlockOptionsOpen(true)}>
            ...
          </FloatingBlockActions.Button>

          <ActionMenuList
            open={actionMenuOpen}
            onOpenChange={onActionMenuOpenChange}
            anchor={turnIntoRef.current}
            blockId={blockId ?? null}
            view="small"
            placement="right-start">
            <ActionMenuList.Content />
          </ActionMenuList>

          <BlockOptions open={blockOptionsOpen} onOpenChange={setBlockOptionsOpen} anchor={optionsButtonRef.current}>
            <BlockOptions.Content>
              <BlockOptions.Group>
                <BlockOptions.Item
                  ref={turnIntoRef}
                  disabled={!blockId}
                  keepOpen
                  onSelect={() => {
                    if (blockId) setActionMenuOpen(true);
                  }}>
                  Turn into
                </BlockOptions.Item>
                <BlockOptions.Item
                  disabled={!blockId}
                  onSelect={() => {
                    if (blockId) duplicateBlock(blockId);
                  }}>
                  Duplicate
                </BlockOptions.Item>
                <BlockOptions.Item
                  disabled={!blockId}
                  onSelect={() => {
                    if (blockId) copyBlockLink(blockId);
                  }}>
                  Copy Link
                </BlockOptions.Item>
                <BlockOptions.Item
                  variant="destructive"
                  disabled={!blockId}
                  onSelect={() => {
                    if (blockId) deleteBlock(blockId);
                  }}>
                  Delete
                </BlockOptions.Item>
              </BlockOptions.Group>
            </BlockOptions.Content>
          </BlockOptions>
        </>
      )}
    </FloatingBlockActions>
  );
}

const EDITOR_STYLES = {
  width: "100%",
  paddingBottom: 100,
};

const INITIAL_VALUE = {
  "block-1": {
    id: "block-1",
    type: "Paragraph",
    value: [
      {
        id: "element-1",
        type: "paragraph",
        children: [{ text: "Start typing..." }],
        props: { nodeType: "block" },
      },
    ],
    meta: { order: 0, depth: 0 },
  },
};

// Unified Editor combining SearchSidebar, Sources, AND full collaboration features
export default function IntegratedLayout() {
  const { id: documentId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // Source management state
  const [sources, setSources] = useState<SourceEntry[]>([]);

  // Collaboration and session state
  const [document, setDocument] = useState<EditorDocument | null>(null);
  const [session, setSession] = useState<ActiveSession | null>(null);
  const [presence, setPresence] = useState<PresenceSnapshot | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Refs
  const containerBoxRef = useRef<HTMLDivElement>(null);
  const releaseRef = useRef<ActiveSession | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Config and derived state
  const config = useMemo(() => getCollaborationConfig(), []);
  const inviteToken = useMemo(
    () => new URLSearchParams(location.search).get("invite")?.trim() || null,
    [location.search],
  );
  const isOwner = session?.accessLevel === "owner";
  const sessionMode = isOwner ? "edit" : "view";

  // Invite / join state
  const [joinError, setJoinError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [viewerInvite, setViewerInvite] = useState<any | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteFeedback, setInviteFeedback] = useState<string | null>(null);
  const [isGeneratingInvite, setIsGeneratingInvite] = useState(false);
  const [sharedUsersInput, setSharedUsersInput] = useState("");

  // Create the Yoopta editor instance
  const editor = useMemo(() => {
    return withEmoji(
      withMentions(
        createYooptaEditor({
          plugins: applyTheme(WORD_PLUGINS) as unknown as YooptaPlugin<
            Record<string, SlateElement>,
            unknown
          >[],
          marks: WORD_MARKS,
        })
      )
    );
  }, []);

  // Store release ref for cleanup
  useEffect(() => {
    releaseRef.current = session;
  }, [session]);

  // Cleanup on unmount
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

  // Load document and claim session
  useEffect(() => {
    if (!documentId) return;
    if (inviteToken) return;

    const username = localStorage.getItem("username");
    if (!username) {
      navigate("/login");
      return;
    }

    let cancelled = false;

    const initialize = async () => {
      try {
        const activeSession = await claimSession({
          documentId,
          username,
        });
        if (cancelled) return;
        setSession(activeSession);


        const nextDocument = await getDocument(documentId, activeSession.sessionId);
        if (cancelled) return;
        setDocument(nextDocument);
        setPresence(nextDocument.presence);

        // Load document content into editor
        if (nextDocument.content && typeof nextDocument.content === "object") {
          editor.setEditorValue(nextDocument.content);
        } else {
          editor.setEditorValue(INITIAL_VALUE);
        }
      } catch (error) {
        if (cancelled) return;
        setErrorMessage(error instanceof Error ? error.message : "Unable to open document.");
      }
    };

    void initialize();
    return () => {
      cancelled = true;
    };
  }, [documentId, inviteToken, navigate, editor]);

  function syncEditorValue(nextDocument: EditorDocument) {
    if (nextDocument.content && typeof nextDocument.content === "object") {
      editor.setEditorValue(nextDocument.content);
      return;
    }

    editor.setEditorValue(INITIAL_VALUE);
  }

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
      const nextDocument = await getDocument(documentId, activeSession.sessionId);
      setDocument(nextDocument);
      setPresence(nextDocument.presence);
      syncEditorValue(nextDocument);
      setErrorMessage(null);
    } catch (error) {
      setJoinError(error instanceof Error ? error.message : "Unable to join the document.");
    } finally {
      setIsJoining(false);
    }
  }

  // Heartbeat to keep session alive
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

  // Poll presence data
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

  // Poll document updates for viewers
  useEffect(() => {
    if (!session || session.accessLevel !== "viewer") {
      return;
    }

    const loadDocument = async () => {
      try {
        const nextDocument = await getDocument(session.documentId, session.sessionId);
        setDocument(nextDocument);
        setPresence(nextDocument.presence);
        syncEditorValue(nextDocument);
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          setErrorMessage("Your viewer session expired. Open the document again.");
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

  // Save handler with debounce
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

  // Editor change handler
  const onChange = (value: YooptaContentValue) => {
    if (!isOwner) {
      return;
    }

    localStorage.setItem("yoopta-word-example", JSON.stringify(value));
    queueSave(value);
  };

  // Source management
  const addSource = (data: { url: string }) => {
    let guessedTitle = "Untitled Page";
    let guessedWebsite = "Unknown Source";

    try {
      const urlObj = new URL(data.url);
      const domainParts = urlObj.hostname.replace("www.", "").split(".");
      const rawSite = domainParts[domainParts.length - 2] || "Source";
      guessedWebsite = rawSite.charAt(0).toUpperCase() + rawSite.slice(1);

      const pathParts = urlObj.pathname.split("/").filter((p) => p !== "");
      if (pathParts.length > 0) {
        const lastPart = pathParts[pathParts.length - 1];
        guessedTitle = decodeURIComponent(lastPart).replace(/-|_/g, " ");
        guessedTitle = guessedTitle.charAt(0).toUpperCase() + guessedTitle.slice(1);
      }
    } catch (e) {
      console.error("Parsing failed", e);
    }

    const newSource: SourceEntry = {
      id: Math.random().toString(36).substr(2, 9),
      url: data.url,
      title: guessedTitle,
      website: guessedWebsite,
      author: "",
      dateAccessed: new Date().toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
      inlineCitation: "",
      studio: "",
      volume: "",
      journal: "",
      year: "",
      publisher: "",
      type: "",
    };
    setSources((prev) => [newSource, ...prev]);
  };

  const updateSource = (updated: SourceEntry) => {
    setSources((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
  };

  function handlePublish() {
    if (!documentId || !document) {
      return;
    }

    const draftKey = getPublishDraftStorageKey(documentId);
    const editorValue = document.content ?? editor.getEditorValue();
    localStorage.setItem(draftKey, JSON.stringify(editorValue));
    const fromPath = `${window.location.pathname}${window.location.search}`;
    navigate(`/publish/${documentId}?from=${encodeURIComponent(fromPath)}`);
  }

  async function loadInvite() {
    if (!session || session.accessLevel !== "owner") {
      setViewerInvite(null);
      return;
    }

    try {
      const nextInvite = await getViewerInvite(session.documentId, session.sessionId);
      setViewerInvite(nextInvite);
      setInviteError(null);
    } catch (error) {
      setInviteError(error instanceof Error ? error.message : "Unable to load invite link.");
    }
  }

  async function handleGenerateInvite() {
    if (!session || session.accessLevel !== "owner") return;
    setIsGeneratingInvite(true);
    setInviteError(null);
    setInviteFeedback(null);

    try {
      const nextInvite = await generateViewerInvite(session.documentId, session.sessionId);
      setViewerInvite(nextInvite);
      setInviteFeedback("Invite link ready to share.");
    } catch (error) {
      setInviteError(error instanceof Error ? error.message : "Unable to generate an invite link.");
    } finally {
      setIsGeneratingInvite(false);
    }
  }

  async function handleCopyInvite() {
    const inviteLink = viewerInvite?.token ? `${window.location.origin}/editor/${documentId}?invite=${viewerInvite.token}` : null;
    if (!inviteLink) return;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(inviteLink);
      } else {
        const el = window.document.createElement("textarea");
        el.value = inviteLink;
        el.style.cssText = "position:fixed;opacity:0";
        window.document.body.appendChild(el);
        el.focus();
        el.select();
        window.document.execCommand("copy");
        window.document.body.removeChild(el);
      }
      setInviteFeedback("Invite link copied.");
      setInviteError(null);
    } catch (error) {
      setInviteError(error instanceof Error ? error.message : "Unable to copy the invite link.");
    }
  }
  function parseCollaborators(input: string) {
    return input
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  async function handleSaveCollaborators() {
    if (!session || !document) return;

    try {
      const nextDocument = await updateSharedViewers(
        document.id,
        session.sessionId,
        parseCollaborators(sharedUsersInput),
      );
      setDocument(nextDocument);
      setPresence(nextDocument.presence);
      setSharedUsersInput(nextDocument.sharedWith.join(", "));
      setInviteFeedback("Collaborator access updated.");
      setInviteError(null);
    } catch (error) {
      setInviteError(error instanceof Error ? error.message : "Unable to update collaborators.");
    }
  }

  const renderBlock = useCallback(({ children, blockId }: RenderBlockProps) => (
    <SortableBlock id={blockId} useDragHandle>
      {children}
    </SortableBlock>
  ), []);

  // Error states
  if (!documentId) {
    return <MissingAccess message="Missing document id." />;
  }

  if (errorMessage) {
    return <MissingAccess message={errorMessage} />;
  }

  if (inviteToken && (!session || !document || !presence)) {
    return (
      <InviteJoinScreen
        documentId={documentId || ""}
        errorMessage={joinError}
        isJoining={isJoining}
        onJoin={handleInviteJoin}
      />
    );
  }

  if (!session || !document || !presence) {
    return <div style={{ padding: "32px" }}>Loading document...</div>;
  }

  return (
    <div className="main-workspace-shell">
      <aside className="workspace-left">
        <SearchSidebar onLinkPasted={addSource} />
        <Sources sourceList={sources} onUpdateSource={updateSource} />
      </aside>
      <main className="workspace-right">
        <WordToolbar
          editor={editor}
          onExport={() => {}}
          onPrint={() => {}}
          onToggleComments={() => setIsCommentsOpen((prev) => !prev)}
          isCommentsOpen={isCommentsOpen}
          onPublish={handlePublish}
          isPublishDisabled={!isOwner}
          onToggleInvite={() => {
            setIsInviteOpen((prev) => !prev);
            if (!isInviteOpen) void loadInvite();
          }}
          isInviteOpen={isInviteOpen}
        />
        <div className="flex-1 bg-neutral-100 dark:bg-neutral-900 overflow-auto">
          <div className="max-w-5xl mx-auto py-8 px-4">
            <div
              ref={containerBoxRef}
              className="bg-white dark:bg-neutral-950 rounded-lg shadow-xl border border-neutral-200 dark:border-neutral-800 min-h-[800px]"
            >
              <div className="p-8 md:p-12 lg:p-16">
                <BlockDndContext editor={editor}>
                  <YooptaEditor
                    editor={editor}
                    style={EDITOR_STYLES}
                    onChange={onChange}
                    renderBlock={renderBlock}
                    placeholder="Start typing your document..."
                  >
                    <MyFloatingBlockActions />
                    <SelectionBox selectionBoxElement={containerBoxRef} />
                    <SlashCommandMenu>
                      {({ items }: { items: Array<{ id: string; title: string; description?: string; icon?: ReactNode }> }) => (
                        <SlashCommandMenu.Content>
                          <SlashCommandMenu.List>
                            <SlashCommandMenu.Empty>No blocks found</SlashCommandMenu.Empty>
                            {items.map((item: { id: string; title: string; description?: string; icon?: ReactNode }) => (
                              <SlashCommandMenu.Item
                                key={item.id}
                                value={item.id}
                                title={item.title}
                                description={item.description}
                                icon={item.icon}
                              />
                            ))}
                          </SlashCommandMenu.List>
                          <SlashCommandMenu.Footer />
                        </SlashCommandMenu.Content>
                      )}
                    </SlashCommandMenu>
                    <MentionDropdown />
                    <EmojiDropdown />
                  </YooptaEditor>
                </BlockDndContext>
              </div>
            </div>
          </div>
        </div>
        {isCommentsOpen ? (
          <aside
            style={{
              position: "fixed",
              top: 88,
              right: 16,
              width: "min(380px, calc(100vw - 32px))",
              maxHeight: "calc(100vh - 108px)",
              overflowY: "auto",
              zIndex: 70,
            }}
          >
            <CommentsPanel
              documentId={documentId}
              sessionId={session?.sessionId || ""}
              canResolveComments={isOwner}
            />
          </aside>
        ) : null}
        {isInviteOpen ? (
          <aside
            style={{
              position: "fixed",
              top: 88,
              right: isCommentsOpen ? 420 : 16,
              width: "min(420px, calc(100vw - 32px))",
              maxHeight: "calc(100vh - 108px)",
              overflowY: "auto",
              zIndex: 80,
            }}
          >
            <div className="invite-card">
              <div>
                <p className="eyebrow">Invite Link</p>
                <h2>Allow guest reviewers in</h2>
                <p className="panel-note">
                  Generate a shareable link for this document. Anyone with the link can
                  join in read-only mode and leave comments.
                </p>
              </div>

              <div className="invite-actions" style={{ marginTop: 12 }}>
                <button
                  className="secondary-button"
                  disabled={isGeneratingInvite}
                  onClick={() => void handleGenerateInvite()}
                  type="button"
                >
                  {isGeneratingInvite ? "Generating..." : viewerInvite?.token ? "Regenerate link" : "Create invite link"}
                </button>
                <button
                  className="primary-button"
                  disabled={!viewerInvite?.token}
                  onClick={() => void handleCopyInvite()}
                  type="button"
                >
                  Copy link
                </button>
              </div>

              {viewerInvite?.token ? (
                <label className="invite-link-field" style={{ marginTop: 12 }}>
                  Shareable link
                  <input readOnly value={`${window.location.origin}/editor/${documentId}?invite=${viewerInvite.token}`} />
                </label>
              ) : null}

              {viewerInvite?.createdAt ? (
                <p className="panel-note">Generated {new Date(viewerInvite.createdAt).toLocaleString()}</p>
              ) : null}

              <label style={{ marginTop: 12 }} className="invite-link-field">
                Collaborator usernames
                <input
                  value={sharedUsersInput}
                  onChange={(e) => setSharedUsersInput(e.target.value)}
                  placeholder="editor1, editor2"
                />
              </label>

              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button className="secondary-button" onClick={() => void handleSaveCollaborators()}>
                  Save collaborators
                </button>
                <button className="secondary-button" onClick={() => { setIsInviteOpen(false); setInviteError(null); setInviteFeedback(null); }}>
                  Close
                </button>
              </div>

              {inviteFeedback ? <p className="invite-feedback">{inviteFeedback}</p> : null}
              {inviteError ? <p className="join-error">{inviteError}</p> : null}
            </div>
          </aside>
        ) : null}
        {session && presence && (
          <CollaborationStatus
            accessLevel={session.accessLevel}
            sessionMode={sessionMode}
            ownerName={presence.ownerName}
            viewerNames={presence.viewerNames}
            viewerCount={presence.viewerCount}
            websocketUrl={null}
            isRealtimeEnabled={false}
            updatedAt={document?.updatedAt || new Date().toISOString()}
          />
        )}
        {session && presence && <RemotePresence session={session} presence={presence} />}
      </main>
    </div>
  );
}
