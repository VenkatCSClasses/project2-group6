
import { useState,type KeyboardEvent } from 'react';

export default function SearchSidebar() {
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
            placeholder="Search or paste link..."
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
