import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { GrDocumentText } from "react-icons/gr";

type DocumentSummary = {
  id: string;
  title: string;
  updatedAt: string;
};

export default function Dashboard() {
  const [writerDocs, setWriterDocs] = useState<DocumentSummary[]>([]);
  const [editorDocs, setEditorDocs] = useState<DocumentSummary[]>([]);
  const [activeTab, setActiveTab] = useState<"writer" | "editor">("writer");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDocs = async () => {
      const username = localStorage.getItem("username");

      if (!username) {
        navigate("/login");
        return;
      }

      const res = await fetch(`/api/documents?username=${encodeURIComponent(username)}`);
      const data = await res.json();
      setWriterDocs(data.writerDocs || []);
      setEditorDocs(data.editorDocs || []);
    };

    void fetchDocs();
  }, [navigate]);

  const openDoc = (id: string) => {
    navigate(`/editor/${id}`);
  };

  const createNewDoc = async () => {
    const username = localStorage.getItem("username");

    if (!username) {
      navigate("/login");
      return;
    }

    const res = await fetch("/api/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, title: "Untitled Document" }),
    });

    const data = await res.json();

    if (!res.ok) {
      return;
    }

    navigate(`/editor/${data.id}`);
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
            <button onClick={createNewDoc} style={plusButtonStyle}>
              +
            </button>
          ) : null}
        </div>

        {docs.length === 0 ? (
          <p style={{ textAlign: "center" }}>No documents yet.</p>
        ) : (
          <div style={docsContainerStyle}>
            {[...docs]
              .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
              .map((doc) => (
                <div key={doc.id} onClick={() => openDoc(doc.id)} style={docStyle}>
                  <GrDocumentText style={{ fontSize: "150px", marginTop: "12px" }} color="white" />
                  <h3 style={{ color: "white", marginBottom: "10px", marginTop: "10px" }}>{doc.title}</h3>
                  <p style={{ color: "white" }}>Last updated: {doc.updatedAt}</p>
                </div>
              ))}
          </div>
        )}
      </section>
    </div>
  );
}

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
