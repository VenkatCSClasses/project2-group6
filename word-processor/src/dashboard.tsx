import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createStarterContent } from "./editor/createStarterContent";

type DocumentSummary = {
  id: string;
  title: string;
  updatedAt: string;
};

function DocIcon() {
  return (
    <svg width="36" height="44" viewBox="0 0 36 44" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="36" height="44" rx="4" fill="#e8eef8" />
      <path d="M22 0v10h10" stroke="#b0bdd6" strokeWidth="1.5" fill="none" />
      <path d="M22 0L32 10H22V0Z" fill="#c5d1e8" />
      <rect x="7" y="18" width="22" height="2" rx="1" fill="#9bacc8" />
      <rect x="7" y="23" width="18" height="2" rx="1" fill="#9bacc8" />
      <rect x="7" y="28" width="20" height="2" rx="1" fill="#9bacc8" />
      <rect x="7" y="33" width="14" height="2" rx="1" fill="#9bacc8" />
    </svg>
  );
}

function ThreeDotMenu({
  onRename,
  onOpen,
}: {
  onRename: () => void;
  onOpen: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div ref={ref} className="doc-menu-wrap" onClick={(e) => e.stopPropagation()}>
      <button
        className="doc-menu-trigger"
        onClick={() => setOpen((v) => !v)}
        title="More options"
      >
        &#8942;
      </button>
      {open && (
        <div className="doc-menu-dropdown">
          <button
            className="doc-menu-item"
            onClick={() => { setOpen(false); onOpen(); }}
          >
            Open
          </button>
          <button
            className="doc-menu-item"
            onClick={() => { setOpen(false); onRename(); }}
          >
            Rename
          </button>
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const [writerDocs, setWriterDocs] = useState<DocumentSummary[]>([]);
  const [editorDocs, setEditorDocs] = useState<DocumentSummary[]>([]);
  const [activeTab, setActiveTab] = useState<"writer" | "editor">("writer");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renameError, setRenameError] = useState<string | null>(null);
  const navigate = useNavigate();
  const username = localStorage.getItem("username") ?? "";

  const fetchDocs = async () => {
    if (!username) { navigate("/login"); return; }
    const res = await fetch(`/api/documents?username=${encodeURIComponent(username)}`);
    const data = await res.json();
    setWriterDocs(data.writerDocs || []);
    setEditorDocs(data.editorDocs || []);
  };

  useEffect(() => { void fetchDocs(); }, [navigate]);

  const openDoc = (id: string) => navigate(`/editor/${id}`);

  const createNewDoc = async () => {
    if (!username) { navigate("/login"); return; }
    const title = "Untitled Document";
    const res = await fetch("/api/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, title, content: createStarterContent(title) }),
    });
    const data = await res.json();
    if (res.ok) navigate(`/editor/${data.id}`);
  };

  const startRename = (doc: DocumentSummary) => {
    setRenamingId(doc.id);
    setRenameValue(doc.title);
    setRenameError(null);
  };

  const commitRename = async () => {
    if (!renamingId) return;
    const trimmed = renameValue.trim();
    if (!trimmed) { setRenameError("Title cannot be empty."); return; }

    const res = await fetch(`/api/documents/${renamingId}/rename`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, title: trimmed }),
    });

    if (!res.ok) {
      const data = await res.json();
      setRenameError(data.error ?? "Unable to rename.");
      return;
    }

    setRenamingId(null);
    setRenameError(null);
    await fetchDocs();
  };

  const cancelRename = () => {
    setRenamingId(null);
    setRenameValue("");
    setRenameError(null);
  };

  const handleLogout = () => {
    localStorage.removeItem("username");
    navigate("/login");
  };

  const docs = [...(activeTab === "writer" ? writerDocs : editorDocs)].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );

  return (
    <div className="dash-shell">
      {/* Top bar */}
      <header className="dash-header">
        <span className="dash-logo">Copybara<span className="dash-logo-cursor">|</span></span>
        <div className="dash-header-right">
          <span className="dash-username">{username}</span>
          <button className="dash-logout" onClick={handleLogout}>Log out</button>
        </div>
      </header>

      <main className="dash-main">
        {/* Section header */}
        <div className="dash-section-header">
          <div className="dash-tabs">
            <button
              className={`dash-tab ${activeTab === "writer" ? "dash-tab-active" : ""}`}
              onClick={() => setActiveTab("writer")}
            >
              My Documents
            </button>
            <button
              className={`dash-tab ${activeTab === "editor" ? "dash-tab-active" : ""}`}
              onClick={() => setActiveTab("editor")}
            >
              Shared With Me
            </button>
          </div>
          {activeTab === "writer" && (
            <button className="dash-new-btn" onClick={() => void createNewDoc()}>
              + New document
            </button>
          )}
        </div>

        {/* Document list */}
        {docs.length === 0 ? (
          <div className="dash-empty">
            <p>No documents yet.</p>
            {activeTab === "writer" && (
              <button className="dash-new-btn" onClick={() => void createNewDoc()}>
                Create your first document
              </button>
            )}
          </div>
        ) : (
          <div className="doc-grid">
            {docs.map((doc) => (
              <div
                key={doc.id}
                className="doc-card"
                onClick={() => renamingId !== doc.id && openDoc(doc.id)}
              >
                <div className="doc-card-thumb">
                  <DocIcon />
                </div>
                <div className="doc-card-body">
                  {renamingId === doc.id ? (
                    <div
                      className="doc-rename-form"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        className="doc-rename-input"
                        autoFocus
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") void commitRename();
                          if (e.key === "Escape") cancelRename();
                        }}
                      />
                      {renameError && <p className="doc-rename-error">{renameError}</p>}
                      <div className="doc-rename-actions">
                        <button className="doc-rename-save" onClick={() => void commitRename()}>Save</button>
                        <button className="doc-rename-cancel" onClick={cancelRename}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <p className="doc-card-title">{doc.title}</p>
                  )}
                  <p className="doc-card-date">
                    {new Date(doc.updatedAt).toLocaleDateString(undefined, {
                      month: "short", day: "numeric", year: "numeric",
                    })}
                  </p>
                </div>
                {activeTab === "writer" && renamingId !== doc.id && (
                  <ThreeDotMenu
                    onOpen={() => openDoc(doc.id)}
                    onRename={() => startRename(doc)}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
