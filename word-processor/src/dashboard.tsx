import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { GrDocumentText } from "react-icons/gr";
import { createStarterContent } from "./editor/createStarterContent";

type DocumentSummary = {
  id: string;
  title: string;
  updatedAt: string;
};

function ThreeDotMenu({ onRename, onOpen }: { onRename: () => void; onOpen: () => void }) {
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
    <div
      ref={ref}
      style={{ position: "absolute", top: "8px", right: "8px" }}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          background: "rgba(255,255,255,0.2)",
          border: "none",
          borderRadius: "4px",
          color: "white",
          fontSize: "18px",
          width: "28px",
          height: "28px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        title="More options"
      >
        &#8942;
      </button>
      {open && (
        <div style={{
          position: "absolute",
          top: "32px",
          right: 0,
          background: "#fff",
          border: "1px solid #e2e8f0",
          borderRadius: "8px",
          boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
          minWidth: "120px",
          zIndex: 20,
          overflow: "hidden",
        }}>
          <button style={menuItemStyle} onClick={() => { setOpen(false); onOpen(); }}>Open</button>
          <button style={menuItemStyle} onClick={() => { setOpen(false); onRename(); }}>Rename</button>
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
  };

  const commitRename = async () => {
    if (!renamingId || !renameValue.trim()) return;
    await fetch(`/api/documents/${renamingId}/rename`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, title: renameValue.trim() }),
    });
    setRenamingId(null);
    await fetchDocs();
  };

  const docs = activeTab === "writer" ? writerDocs : editorDocs;

  return (
    <div style={{ marginBottom: "20px" }}>
      <h1 style={{ marginBottom: "85px", marginTop: "50px", fontSize: "75px" }}>Copybara|</h1>

      <div style={tabsContainerStyle}>
        <button onClick={() => setActiveTab("writer")} style={tabStyle(activeTab === "writer")}>
          Writer
        </button>
        <button onClick={() => setActiveTab("editor")} style={tabStyle(activeTab === "editor")}>
          Editor
        </button>
      </div>

      <section>
        <div style={headerWrapperStyle}>
          <h2 style={headerTitleStyle}>
            {activeTab === "writer" ? "Writer Documents" : "Editor Documents"}
          </h2>
          {activeTab === "writer" ? (
            <button onClick={() => void createNewDoc()} style={plusButtonStyle}>+</button>
          ) : null}
        </div>

        {docs.length === 0 ? (
          <p style={{ textAlign: "center" }}>No documents yet.</p>
        ) : (
          <div style={docsContainerStyle}>
            {[...docs]
              .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
              .map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => renamingId !== doc.id && openDoc(doc.id)}
                  style={{ ...docStyle, position: "relative" }}
                >
                  <GrDocumentText style={{ fontSize: "150px", marginTop: "12px" }} color="white" />

                  {renamingId === doc.id ? (
                    <div onClick={(e) => e.stopPropagation()} style={{ padding: "0 8px 10px" }}>
                      <input
                        autoFocus
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") void commitRename();
                          if (e.key === "Escape") setRenamingId(null);
                        }}
                        style={{
                          width: "100%",
                          padding: "4px 6px",
                          borderRadius: "4px",
                          border: "1px solid #fff",
                          fontSize: "14px",
                          boxSizing: "border-box",
                        }}
                      />
                      <div style={{ display: "flex", gap: "6px", marginTop: "6px" }}>
                        <button onClick={() => void commitRename()} style={renameSaveStyle}>Save</button>
                        <button onClick={() => setRenamingId(null)} style={renameCancelStyle}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <h3 style={{ color: "white", marginBottom: "10px", marginTop: "10px" }}>{doc.title}</h3>
                  )}

                  <p style={{ color: "white" }}>Last updated: {doc.updatedAt}</p>

                  {activeTab === "writer" && renamingId !== doc.id && (
                    <ThreeDotMenu onOpen={() => openDoc(doc.id)} onRename={() => startRename(doc)} />
                  )}
                </div>
              ))}
          </div>
        )}
      </section>
    </div>
  );
}

const menuItemStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  padding: "8px 14px",
  border: "none",
  background: "transparent",
  textAlign: "left",
  fontSize: "14px",
  color: "#334155",
  cursor: "pointer",
};

const docStyle: React.CSSProperties = {
  border: "1px solid #ccc",
  backgroundColor: "#4f5f85",
  padding: "10px",
  borderRadius: "8px",
  marginTop: "10px",
  cursor: "pointer",
  width: "fit-content",
};

const docsContainerStyle: React.CSSProperties = {
  display: "flex",
  marginLeft: "50px",
  gap: "20px",
  flexWrap: "wrap",
};

const tabStyle = (active: boolean): React.CSSProperties => ({
  padding: "7px 16px",
  margin: "0 3px",
  width: "300px",
  fontSize: "18px",
  border: "none",
  borderRadius: "15px",
  cursor: "pointer",
  backgroundColor: active ? "#2563eb" : "#e5e7eb",
  color: active ? "white" : "black",
});

const tabsContainerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  backgroundColor: "#f3f4f6",
  padding: "5px",
  marginBottom: "20px",
  borderRadius: "15px",
  width: "fit-content",
  margin: "0 auto 20px auto",
};

const headerWrapperStyle: React.CSSProperties = {
  position: "relative",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  marginLeft: "50px",
  marginRight: "50px",
  marginBottom: "10px",
};

const headerTitleStyle: React.CSSProperties = {
  margin: 0,
  textAlign: "center",
};

const plusButtonStyle: React.CSSProperties = {
  position: "absolute",
  right: 0,
  fontSize: "30px",
  width: "40px",
  height: "40px",
  borderRadius: "50%",
  border: "none",
  cursor: "pointer",
  backgroundColor: "#b2b2b2",
  color: "white",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  lineHeight: "40px",
};

const renameSaveStyle: React.CSSProperties = {
  flex: 1,
  padding: "4px",
  border: "none",
  borderRadius: "4px",
  background: "#2563eb",
  color: "white",
  fontSize: "12px",
  cursor: "pointer",
  fontWeight: 600,
};

const renameCancelStyle: React.CSSProperties = {
  flex: 1,
  padding: "4px",
  border: "none",
  borderRadius: "4px",
  background: "rgba(255,255,255,0.2)",
  color: "white",
  fontSize: "12px",
  cursor: "pointer",
};
