
import { useState,type KeyboardEvent } from 'react';

//An interface that recieves the onlink pasted funcion from the parent

interface SidebarProps {
    onLinkPasted: (data: { url: string;}) => void;
}
//Add the interface to the function parameters
export default function SearchSidebar({ onLinkPasted }: SidebarProps) {
  const [url, setUrl] = useState('https://en.wikipedia.org/wiki/Main_Page');
  const [inputValue, setInputValue] = useState('');

  const handleSearch = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const entry = inputValue.trim();
      if (!entry) return;
      
    
      // Logic: If it has a dot and no spaces, treat it as a link
      const isLink = /^[^\s]+\.[^\s]+$/.test(entry);

      if (isLink) {
       const finalUrl = entry.startsWith('http') ? entry : `https://${entry}`;


       //Send the structured data to the Layout for the Sources list
        onLinkPasted({
          url: finalUrl,
        });

        setUrl(finalUrl);
      } else {
        // Otherwise, it's a search term
        window.open(`https://www.google.com/search?q=${encodeURIComponent(entry)}`, '_blank');
      }
      setInputValue(''); // Clear bar after search
    }
  };

  return (
    <div className="sidebar-flex">
      <div className="search-bar-container">
        <div className="search-bar-wrapper">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="modern-search-input"
            placeholder="Paste link and press Enter..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleSearch}
            
          />
        </div>
      </div>
      <div className="view-window">
        <iframe 
          src={url} 
          title="Web Preview" 
          sandbox="allow-scripts allow-same-origin allow-forms"
        />
      </div>
    </div>
  );
}
