import { describe, expect, it } from 'vitest';
import {
  deriveStoryFields,
  getPublishDraftStorageKey,
  normalizeSiteUrl,
} from '../word-processor/src/publish';

describe('publish helpers', () => {
  it('normalizes site URLs for publishing', () => {
    expect(normalizeSiteUrl(' example.com/posts/ ')).toBe('https://example.com');
    expect(normalizeSiteUrl('http://localhost:3000/docs/')).toBe('http://localhost:3000');
  });

  it('derives title and content from nested editor source values', () => {
    const story = deriveStoryFields([
      { text: 'My Headline' },
      { children: [{ text: 'First paragraph' }, { text: ' with detail' }] },
      { value: [{ text: 'Second block' }] },
    ]);

    expect(story).toEqual({
      title: 'My Headline',
      content: 'First paragraph with detail\nSecond block',
    });
  });

  it('builds a stable draft storage key', () => {
    expect(getPublishDraftStorageKey('doc-123')).toBe('wp-publish-draft:doc-123');
  });
});