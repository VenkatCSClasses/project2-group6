
import SearchSidebar from './SearchSidebar';
import './IntegratedStyles.css';
import Sources from './Sources';
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { WordEditor } from './Appv2';

//Define the SourceEntry structure for MLA data
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

//IntegratedLayout combines the SearchSidebar and the Editor into a cohesive layout

export default function IntegratedLayout() {
    const { id: documentId } = useParams();
    const navigate = useNavigate();
    const [sources, setSources] = useState<SourceEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
      if (!documentId) {
        setError("Missing document ID");
        setLoading(false);
        return;
      }

      const loadDocument = async () => {
        try {
          const username = localStorage.getItem("username");
          if (!username) {
            navigate("/login");
            return;
          }

          // First, claim a session for this document
          const sessionRes = await fetch(`http://localhost:3001/api/documents/${documentId}/session/claim`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, displayName: username }),
          });

          if (!sessionRes.ok) {
            const errorData = await sessionRes.json();
            throw new Error(`Failed to claim session: ${errorData.error || sessionRes.statusText}`);
          }

          const sessionData = await sessionRes.json();
          const { sessionId } = sessionData;
          
          console.log("✅ Session claimed successfully");
          console.log("Session data:", sessionData);
          console.log("Using sessionId:", sessionId);

          // Now fetch the document with the session ID
          const docUrl = `http://localhost:3001/api/documents/${documentId}?sessionId=${sessionId}`;
          console.log("📄 Fetching document from:", docUrl);
          
          const res = await fetch(docUrl);
          
          if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            console.error("❌ Document fetch failed:", res.status, errorData);
            throw new Error(`Failed to load document: ${errorData.error || res.statusText}`);
          }
          const data = await res.json();
          
          console.log("✅ Document loaded successfully:", { data });
          
          // Store document content in localStorage so WordEditor can load it
          if (data.content) {
            localStorage.setItem("yoopta-word-example", JSON.stringify(data.content));
          }
          
          // Load any sources from the document if they exist
          if (data.sources) {
            setSources(data.sources);
          }
          
          // Store current document ID and session for saving later
          sessionStorage.setItem("currentDocumentId", documentId);
          sessionStorage.setItem("currentSessionId", sessionId);
          
          setLoading(false);
        } catch (err) {
          console.error("Error loading document:", err);
          setError(err instanceof Error ? err.message : "Error loading document");
          setLoading(false);
        }
      };

      loadDocument();
    }, [documentId, navigate]);

    if (loading) {
      return <div style={{ padding: "32px" }}>Loading document...</div>;
    }

    if (error) {
      return <div style={{ padding: "32px" }}><h1>Error</h1><p>{error}</p></div>;
    }

    //This takes a URL and guesses the Title/Website
    const addSource = (data: { url: string }) => {
        let guessedTitle = "Untitled Page";
        let guessedWebsite = "Unknown Source";

        try {
        const urlObj = new URL(data.url);

        // Guess Website: Extract the domain (e.g., 'wikipedia') and capitalize
        const domainParts = urlObj.hostname.replace('www.', '').split('.');
        const rawSite = domainParts[domainParts.length - 2] || "Source";
        guessedWebsite = rawSite.charAt(0).toUpperCase() + rawSite.slice(1);

        // Guess Title: Take the last part of the URL path and clean it up
        const pathParts = urlObj.pathname.split('/').filter(p => p !== "");
        if (pathParts.length > 0) {
            const lastPart = pathParts[pathParts.length - 1];
            // Decodes URL characters and replaces dashes/underscores with spaces
            guessedTitle = decodeURIComponent(lastPart).replace(/-|_/g, ' ');
            // Capitalize first letter
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
          author: '', // Set to empty so user can fill in the Author later
          dateAccessed: new Date().toLocaleDateString('en-GB', {
            day: 'numeric', month: 'short', year: 'numeric'
          }),
          inlineCitation: '',
          studio: '',
          volume: '',
          journal: '',
          year: '',
          publisher: '',
          type: ''
        };
        setSources(prev => [newSource, ...prev]);
    };

    //The "Update" function to save edits from the citation list
    const updateSource = (updated: SourceEntry) => {
        setSources(prev => prev.map(s => s.id === updated.id ? updated : s));
    };
   

 return (
   <div className="main-workspace-shell">
     <aside className="workspace-left">
        <SearchSidebar onLinkPasted={addSource} />
        <Sources sourceList={sources} onUpdateSource={updateSource} />   
     </aside>
     <main className="workspace-right">
      <WordEditor />
     </main>
   </div>
 );
}
