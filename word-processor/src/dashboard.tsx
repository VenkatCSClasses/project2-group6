import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

type Document = {
   id: string;
   title: string;
   updatedAt: string;
};

const Dashboard: React.FC = () => {
   const [writerDocs, setWriterDocs] = useState<Document[]>([]);
   const [editorDocs, setEditorDocs] = useState<Document[]>([]);
   const navigate = useNavigate();

   const [activeTab, setActiveTab] = useState<"writer" | "editor">("writer");

   // Simulated fetch (replace with API later)
   useEffect(() => {
      const mockWriter: Document[] = [
         { id: "1", title: "My First Article", updatedAt: "2026-04-10" },
         { id: "2", title: "Interview Notes", updatedAt: "2026-04-12" },
      ];

      const mockEditor: Document[] = [
         { id: "3", title: "Breaking News Draft", updatedAt: "2026-04-11" },
      ];

      setWriterDocs(mockWriter);
      setEditorDocs(mockEditor);
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
      <div style={{ marginBottom: "20px" }}>
         <h1 style={{marginBottom: "100px", fontSize: "75px"}}>Capybara|</h1>

         <div style={tabsContainerStyle}>
            <button onClick={() => setActiveTab("writer")} style={tabStyle(activeTab === "writer")}>
               Writer
            </button>

            <button onClick={() => setActiveTab("editor")} style={tabStyle(activeTab === "editor")}>
               Editor
            </button>
         </div>

         {activeTab === "writer" && (
            <section>
               <h2>Writer Documents</h2>

               {writerDocs.length === 0 ? (
                  <p>No documents yet.</p>
               ) : (
                  writerDocs.map((doc) => (
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
         )}

         {activeTab === "editor" && (
            <section>
               <h2>Editor Documents</h2>

               {editorDocs.length === 0 ? (
                  <p>No editor documents.</p>
               ) : (
                  editorDocs.map((doc) => (
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
         )}
      </div>
   );
};

const cardStyle: React.CSSProperties = {
   border: "1px solid #ccc",
   padding: "10px",
   borderRadius: "8px",
   marginTop: "10px",
   cursor: "pointer",
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

export default Dashboard;
