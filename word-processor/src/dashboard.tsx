import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

type Document = {
  id: string;
  title: string;
  updatedAt: string;
};

const Dashboard: React.FC = () => {
  const [ownedDocs, setOwnedDocs] = useState<Document[]>([]);
  const [sharedDocs, setSharedDocs] = useState<Document[]>([]);
  const navigate = useNavigate();

  // Simulated fetch (replace with API later)
  useEffect(() => {
    const mockOwned: Document[] = [
      { id: "1", title: "My First Article", updatedAt: "2026-04-10" },
      { id: "2", title: "Interview Notes", updatedAt: "2026-04-12" },
    ];

    const mockShared: Document[] = [
      { id: "3", title: "Breaking News Draft", updatedAt: "2026-04-11" },
    ];

    setOwnedDocs(mockOwned);
    setSharedDocs(mockShared);
  }, []);

  const openDoc = (id: string) => {
    navigate(`/editor/${id}`);
  };

  const createNewDoc = () => {
    // Later this should call backend
    const newId = Date.now().toString();
    navigate(`/editor/${newId}`);
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>Dashboard</h1>

      <button onClick={createNewDoc} style={{ marginBottom: "20px" }}>
        + New Document
      </button>

      {/* Owned Documents */}
      <section>
        <h2>Your Documents</h2>
        {ownedDocs.length === 0 ? (
          <p>No documents yet.</p>
        ) : (
          ownedDocs.map((doc) => (
            <div
              key={doc.id}
              onClick={() => openDoc(doc.id)}
              style={cardStyle}
            >
              <h3>{doc.title}</h3>
              <p>Last updated: {doc.updatedAt}</p>
            </div>
          ))
        )}
      </section>

      {/* Shared Documents */}
      <section style={{ marginTop: "30px" }}>
        <h2>Shared With You</h2>
        {sharedDocs.length === 0 ? (
          <p>No shared documents.</p>
        ) : (
          sharedDocs.map((doc) => (
            <div
              key={doc.id}
              onClick={() => openDoc(doc.id)}
              style={cardStyle}
            >
              <h3>{doc.title}</h3>
              <p>Last updated: {doc.updatedAt}</p>
            </div>
          ))
        )}
      </section>
    </div>
  );
};

// Simple reusable style
const cardStyle: React.CSSProperties = {
  border: "1px solid #ccc",
  padding: "10px",
  borderRadius: "8px",
  marginTop: "10px",
  cursor: "pointer",
};

export default Dashboard;
