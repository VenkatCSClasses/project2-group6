import { describe, expect, it } from 'vitest';
import { buildSourceEntryFromUrl, formatMlaCitation } from '../word-processor/src/sourceTracking';

describe('source tracking helpers', () => {
  it('guesses metadata from a URL', () => {
    const source = buildSourceEntryFromUrl('https://www.nytimes.com/2024/04/28/world/europe/article-name.html', {
      id: 'source-1',
      now: new Date('2026-04-28T12:00:00.000Z'),
    });

    expect(source).toMatchObject({
      id: 'source-1',
      url: 'https://www.nytimes.com/2024/04/28/world/europe/article-name.html',
      title: 'Article name.html',
      website: 'Nytimes',
      dateAccessed: '28 Apr 2026',
    });
  });

  it('formats an MLA citation preview with fallbacks', () => {
    const citation = formatMlaCitation({
      id: 'source-2',
      url: 'https://example.com/story',
      title: 'Story Title',
      website: 'Example',
      author: 'Doe, Jane',
      dateAccessed: '28 Apr 2026',
      inlineCitation: '',
      studio: '',
      volume: '',
      journal: '',
      year: '2024',
      publisher: '',
      type: 'book',
    });

    expect(citation).toContain('Doe, Jane.');
    expect(citation).toContain('Story Title.');
    expect(citation).toContain('(Doe, 2024)');
  });
});