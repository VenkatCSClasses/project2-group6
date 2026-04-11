import { useState } from 'react';
import { type SourceEntry } from './IntegratedLayout';

interface SourcesProps {
  sourceList: SourceEntry[];
  onUpdateSource: (updated: SourceEntry) => void;
}

export default function Sources({ sourceList, onUpdateSource }: SourcesProps) {
  // Track which citation is currently being edited
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="sources-container">
      <h3 className="sources-title">Works Cited (MLA)</h3>
      
      {sourceList.length === 0 ? (
        <p style={{ fontSize: '11px', opacity: 0.5 }}>No sources added yet.</p>
      ) : (
        <div className="citation-list">
          {sourceList.map((src) => (
            <div key={src.id} className="citation-wrapper">
              {editingId === src.id ? (
                /* --- EDIT MODE --- */
                <div className="edit-form">
                  <input 
                    value={src.author} 
                    placeholder="Author (Last, First)" 
                    onChange={(e) => onUpdateSource({...src, author: e.target.value})} 
                  />
                  <input 
                    value={src.title} 
                    placeholder="Article Title" 
                    onChange={(e) => onUpdateSource({...src, title: e.target.value})} 
                  />
                  <input 
                    value={src.website} 
                    placeholder="Website Name" 
                    onChange={(e) => onUpdateSource({...src, website: e.target.value})} 
                  />
                  <button className="save-btn" onClick={() => setEditingId(null)}>
                    Done
                  </button>
                </div>
              ) : (
                /* --- VIEW MODE --- */
                <div className="citation-item">
                  <p className="mla-text">
                    {src.author && `${src.author}. `} 
                    "{src.title}." 
                    <i> {src.website}</i>, 
                    {src.url}. Accessed {src.dateAccessed}.
                  </p>
                  <button 
                    className="edit-trigger" 
                    onClick={() => setEditingId(src.id)}
                    title="Edit Citation"
                  >
                    ✏️
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}