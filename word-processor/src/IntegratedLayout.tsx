import Editor from './App'; // Import the original Yoopta editor
import SearchSidebar from './SearchSidebar';
import './IntegratedStyles.css';
import Sources from './Sources';
import './IntegratedStyles.css';
import { useState } from 'react';

//Define the SourceEntry structure for MLA data
export type SourceEntry = {
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
    //Central state to hold our list of citations
    const [sources, setSources] = useState<SourceEntry[]>([]);


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
        })
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
       <Editor />
     </main>
   </div>
 );
}
