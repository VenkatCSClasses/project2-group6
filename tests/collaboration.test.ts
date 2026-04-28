import { describe, expect, it } from 'vitest';
const {
  buildPresence,
  createInviteState,
  normalizeSharedUsers,
  syncUserDocumentLists,
} = require('../backend/documents.js') as {
  buildPresence: (record: unknown) => unknown;
  createInviteState: () => unknown;
  normalizeSharedUsers: (sharedWith: unknown) => string[];
  syncUserDocumentLists: (data: unknown) => void;
};

type UserFixture = {
  username: string;
  documents: { writer: Array<{ id: string; title: string; updatedAt: string }>; editor: Array<{ id: string; title: string; updatedAt: string }> };
};

describe('collaboration helpers', () => {
  it('normalizes shared users and builds a presence snapshot', () => {
    expect(normalizeSharedUsers(['alice', 'alice', ' bob ', '', null])).toEqual([
      'alice',
      'bob',
    ]);

    const activeSession = {
      sessionId: 'session-1',
      displayName: 'Alice',
      lastSeenAt: new Date().toISOString(),
    };

    const record = {
      id: 'doc-1',
      title: 'Draft',
      ownerUsername: 'owner',
      sharedWith: ['bob'],
      invite: createInviteState(),
      content: {},
      comments: [],
      updatedAt: new Date().toISOString(),
      sessions: {
        owner: activeSession,
        viewers: [activeSession],
      },
    };

    expect(buildPresence(record)).toEqual({
      ownerName: 'owner',
      viewerNames: ['Alice'],
      ownerConnected: true,
      viewerConnected: true,
      viewerCount: 1,
    });
  });

  it('syncs document summaries into writer and editor lists', () => {
    const data: { users: UserFixture[]; documentsStore: Record<string, unknown> } = {
      users: [
        { username: 'owner', documents: { writer: [], editor: [] } },
        { username: 'bob', documents: { writer: [], editor: [] } },
      ],
      documentsStore: {
        'doc-1': {
          id: 'doc-1',
          title: 'Draft',
          ownerUsername: 'owner',
          sharedWith: ['bob'],
          invite: createInviteState(),
          content: {},
          comments: [],
          updatedAt: '2026-04-28T00:00:00.000Z',
          sessions: { owner: null, viewers: [] },
        },
      },
    };

    syncUserDocumentLists(data);

    expect(data.users[0].documents.writer).toEqual([
      { id: 'doc-1', title: 'Draft', updatedAt: '2026-04-28T00:00:00.000Z' },
    ]);
    expect(data.users[1].documents.editor).toEqual([
      { id: 'doc-1', title: 'Draft', updatedAt: '2026-04-28T00:00:00.000Z' },
    ]);
  });
});