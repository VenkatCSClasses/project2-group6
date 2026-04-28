import { describe, expect, it } from 'vitest';
import { createStarterContent } from '../word-processor/src/editor/createStarterContent';

describe('createStarterContent', () => {
  it('creates a three-block starter document with the requested title', () => {
    const content = createStarterContent('Project Notes');

    const blocks = Object.values(content);
    expect(blocks).toHaveLength(3);

    const heading = blocks[0] as { type: string; value: Array<{ children: Array<{ text: string }> }> };
    expect(heading.type).toBe('HeadingOne');
    expect(heading.value[0].children[0].text).toBe('Project Notes');

    const intro = blocks[1] as { value: Array<{ children: Array<{ text: string }> }> };
    expect(intro.value[0].children[0].text).toContain('Start writing here');
  });
});