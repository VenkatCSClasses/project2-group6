import { useState } from 'react';
import { formatMlaCitation, type SourceEntry } from './sourceTracking';

// Added a helper type for clarity ) 
type SourceType = 'website' | 'book' | 'film' | 'article' | 'interview';

interface SourcesProps {
  sourceList: SourceEntry[];
  onUpdateSource: (updated: SourceEntry) => void;
}

export default function Sources({ sourceList, onUpdateSource }: SourcesProps) {
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
                <div className="edit-form" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  
                  {/* Added Type Selector Dropdown */}
                  <select 
                    value={src.type || 'website'} 
                    onChange={(e) => onUpdateSource({...src, type: e.target.value as SourceType})}
                    style={{ marginBottom: '5px' }}
                  >
                    <option value="website">Website</option>
                    <option value="book">Book</option>
                    <option value="article">Article/Journal</option>
                    <option value="film">Film/Movie</option>
                    <option value="interview">Interview/Word of Mouth</option>
                  </select>

                  {/* Universal Author/Title Fields */}
                  <input 
                    value={src.author} 
                    placeholder={src.type === 'interview' ? "Interviewee (Last, First)" : "Author/Director (Last, First)"} 
                    onChange={(e) => onUpdateSource({...src, author: e.target.value})} 
                  />
                  <input 
                    value={src.title} 
                    placeholder={src.type === 'book' ? "Book Title" : "Title/Subject"} 
                    onChange={(e) => onUpdateSource({...src, title: e.target.value})} 
                  />
                  
                  {/* Universal Inline Citation */}
                    <input
                    value={src.inlineCitation || ''}
                    // Placeholder changes based on type for user guidance, if the author name is missing, it will default to (Author, Year) in the preview
                    //The user will need to edit the Year part hecause we currently don't have a way to guess it from the URL, but they can add it manually in the inline citation field if they want it to appear
                    // If author is present but no year, it will default to (src.author, "Year") in the preview
                    // If both author and year are missing, it will default to ("Author", "Year") in the preview
                    placeholder={`Inline Citation (e.g., ${src.author ? src.author.split(',')[0] : "Author"}, Year)`}
                    onChange={(e) => onUpdateSource({...src, inlineCitation: e.target.value})}
                  />        

                

                  {/* Conditional Logic for Specific Fields */}
                  {src.type === 'website' && (
                    <>
                      <input value={src.website || ''} placeholder="Website Name" onChange={(e) => onUpdateSource({...src, website: e.target.value})} />
                      <input value={src.url || ''} placeholder="URL" onChange={(e) => onUpdateSource({...src, url: e.target.value})} />
                    </>
                  )}

                  {src.type === 'book' && (
                    <>
                      <input value={src.publisher || ''} placeholder="Publisher" onChange={(e) => onUpdateSource({...src, publisher: e.target.value})} />
                      <input value={src.year || ''} placeholder="Year of Publication" onChange={(e) => onUpdateSource({...src, year: e.target.value})} />
                    </>
                  )}

                  {src.type === 'article' && (
                    <>
                      <input value={src.journal || ''} placeholder="Journal/Magazine Name" onChange={(e) => onUpdateSource({...src, journal: e.target.value})} />
                      <input value={src.volume || ''} placeholder="Vol/Issue" onChange={(e) => onUpdateSource({...src, volume: e.target.value})} />
                    </>
                  )}

                  {src.type === 'film' && (
                    <input value={src.studio || ''} placeholder="Production Studio" onChange={(e) => onUpdateSource({...src, studio: e.target.value})} />
                  )}

                  {src.type === 'interview' && (
                    <input value={src.dateAccessed || ''} placeholder="Date of Interview" onChange={(e) => onUpdateSource({...src, dateAccessed: e.target.value})} />
                  )}

                  <button className="save-btn" onClick={() => setEditingId(null)}>
                    Done
                  </button>
                </div>
              ) : (
                /* --- VIEW MODE --- */
                <div className="citation-item">
                  {/*  Updated Preview Text to handle various types*/}
                  <p className="mla-text">{formatMlaCitation(src)}</p>
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