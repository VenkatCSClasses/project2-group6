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
import { getDocument, saveDocument } from "./editor/documents/documentApi";
import type { EditorDocument } from "./editor/documents/types";
import {
  claimSession,
  getPresence,
  heartbeatSession,
  releaseSession,
} from "./editor/session/sessionApi";

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
    if (!documentId || inviteToken) {
      return;
    }

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

  const renderBlock = useCallback(({ children, blockId }: RenderBlockProps) => (
    <SortableBlock id={blockId} useDragHandle>
      {children}
    </SortableBlock>
  ), []);

  // Error states
  if (!documentId) {
    return <div style={{ padding: "32px" }}>Missing document ID</div>;
  }

  if (errorMessage) {
    return (
      <div style={{ padding: "32px" }}>
        <h1>Error</h1>
        <p>{errorMessage}</p>
      </div>
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
        <WordToolbar editor={editor} onExport={() => {}} onPrint={() => {}} />
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
                <CommentsPanel
                  documentId={documentId}
                  sessionId={session?.sessionId || ""}
                  canResolveComments={isOwner}
                />
              </div>
            </div>
          </div>
        </div>
        {session && presence && (
          <CollaborationStatus
            accessLevel={session.accessLevel}
            sessionMode="edit"
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
