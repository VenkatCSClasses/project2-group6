import { describe, expect, it } from 'vitest';

const {
  buildPresence,
  createDocumentRecord,
  createInviteState,
  normalizeInvite,
  normalizeRecord,
  normalizeSharedUsers,
  syncUserDocumentLists,
} = require('../backend/documents.js') as {
  buildPresence: (record: unknown) => {
    ownerName: string;
    viewerNames: string[];
    ownerConnected: boolean;
    viewerConnected: boolean;
    viewerCount: number;
  };
  createDocumentRecord: (opts: {
    id: string;
    title?: string;
    ownerUsername: string;
    updatedAt?: string;
    content?: object;
  }) => Record<string, unknown>;
  createInviteState: () => { token: null; createdAt: null; lastUsedAt: null };
  normalizeInvite: (invite: unknown) => { token: string | null; createdAt: string | null; lastUsedAt: string | null };
  normalizeRecord: (record: Record<string, unknown>) => Record<string, unknown>;
  normalizeSharedUsers: (sharedWith: unknown) => string[];
  syncUserDocumentLists: (data: {
    users: Array<{ username: string; documents: { writer: unknown[]; editor: unknown[] } }>;
    documentsStore: Record<string, unknown>;
  }) => void;
};

// ─── normalizeSharedUsers ────────────────────────────────────────────────────

describe('normalizeSharedUsers', () => {
  it('removes duplicates', () => {
    expect(normalizeSharedUsers(['alice', 'alice', 'bob'])).toEqual(['alice', 'bob']);
  });

  it('trims whitespace from each entry', () => {
    expect(normalizeSharedUsers([' alice ', '  bob'])).toEqual(['alice', 'bob']);
  });

  it('filters out empty strings', () => {
    expect(normalizeSharedUsers(['alice', '', '   '])).toEqual(['alice']);
  });

  it('returns an empty array for null input', () => {
    expect(normalizeSharedUsers(null)).toEqual([]);
  });

  it('returns an empty array for non-array input', () => {
    expect(normalizeSharedUsers('alice')).toEqual([]);
    expect(normalizeSharedUsers(42)).toEqual([]);
    expect(normalizeSharedUsers({})).toEqual([]);
  });
});

// ─── createDocumentRecord ────────────────────────────────────────────────────

describe('createDocumentRecord', () => {
  it('initializes all required fields', () => {
    const record = createDocumentRecord({
      id: 'doc-1',
      title: 'My Doc',
      ownerUsername: 'alice',
      updatedAt: '2026-04-28T00:00:00.000Z',
      content: { block: true },
    });

    expect(record).toMatchObject({
      id: 'doc-1',
      title: 'My Doc',
      ownerUsername: 'alice',
      sharedWith: [],
      content: { block: true },
      comments: [],
      updatedAt: '2026-04-28T00:00:00.000Z',
      sessions: { owner: null, viewers: [] },
    });
    expect(record.invite).toEqual({ token: null, createdAt: null, lastUsedAt: null });
  });

  it('defaults title to "Untitled Document" when omitted', () => {
    const record = createDocumentRecord({ id: 'doc-2', ownerUsername: 'alice' });
    expect(record.title).toBe('Untitled Document');
  });

  it('defaults content to an empty object when omitted', () => {
    const record = createDocumentRecord({ id: 'doc-3', ownerUsername: 'alice' });
    expect(record.content).toEqual({});
  });
});

// ─── normalizeInvite ─────────────────────────────────────────────────────────

describe('normalizeInvite', () => {
  it('returns a blank invite state for null input', () => {
    expect(normalizeInvite(null)).toEqual({ token: null, createdAt: null, lastUsedAt: null });
  });

  it('returns a blank invite state for non-object input', () => {
    expect(normalizeInvite('bad')).toEqual({ token: null, createdAt: null, lastUsedAt: null });
    expect(normalizeInvite(42)).toEqual({ token: null, createdAt: null, lastUsedAt: null });
  });

  it('preserves an existing token and timestamps', () => {
    const invite = {
      token: 'abc-123',
      createdAt: '2026-01-01T00:00:00.000Z',
      lastUsedAt: '2026-01-02T00:00:00.000Z',
    };
    expect(normalizeInvite(invite)).toEqual(invite);
  });

  it('fills in null for missing fields', () => {
    expect(normalizeInvite({ token: 'tok' })).toEqual({
      token: 'tok',
      createdAt: null,
      lastUsedAt: null,
    });
  });
});

// ─── normalizeRecord ─────────────────────────────────────────────────────────

describe('normalizeRecord', () => {
  it('adds an empty comments array when missing', () => {
    const record = normalizeRecord({ id: 'doc-1', title: 'Draft', ownerUsername: 'alice', sessions: {} });
    expect(record.comments).toEqual([]);
  });

  it('adds an empty sharedWith array when missing', () => {
    const record = normalizeRecord({ id: 'doc-1', ownerUsername: 'alice', sessions: {} });
    expect(record.sharedWith).toEqual([]);
  });

  it('defaults title to "Untitled Document" when missing', () => {
    const record = normalizeRecord({ id: 'doc-1', ownerUsername: 'alice', sessions: {} });
    expect(record.title).toBe('Untitled Document');
  });

  it('replaces non-object content with an empty object', () => {
    const record = normalizeRecord({ id: 'doc-1', ownerUsername: 'alice', content: 'bad', sessions: {} });
    expect(record.content).toEqual({});
  });

  it('preserves existing values and does not overwrite them', () => {
    const record = normalizeRecord({
      id: 'doc-1',
      title: 'Existing Title',
      ownerUsername: 'alice',
      sharedWith: ['bob'],
      content: { x: 1 },
      comments: [{ id: 'c1' }],
      sessions: { owner: null, viewers: [] },
    });

    expect(record.title).toBe('Existing Title');
    expect(record.sharedWith).toEqual(['bob']);
    expect(record.content).toEqual({ x: 1 });
    expect(record.comments).toEqual([{ id: 'c1' }]);
  });
});

// ─── buildPresence ───────────────────────────────────────────────────────────

function activeSession(displayName: string, overrides: Record<string, unknown> = {}) {
  return {
    sessionId: `session-${displayName}`,
    displayName,
    lastSeenAt: new Date().toISOString(),
    ...overrides,
  };
}

function expiredSession(displayName: string) {
  return {
    sessionId: `session-${displayName}`,
    displayName,
    lastSeenAt: new Date(Date.now() - 60_000).toISOString(),
  };
}

function makeRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 'doc-1',
    title: 'Draft',
    ownerUsername: 'owner',
    sharedWith: [],
    invite: createInviteState(),
    content: {},
    comments: [],
    updatedAt: new Date().toISOString(),
    sessions: { owner: null, viewers: [] },
    ...overrides,
  };
}

describe('buildPresence', () => {
  it('reports owner as connected when their session is active', () => {
    const record = makeRecord({ sessions: { owner: activeSession('owner'), viewers: [] } });
    const presence = buildPresence(record);

    expect(presence.ownerConnected).toBe(true);
    expect(presence.ownerName).toBe('owner');
  });

  it('reports owner as disconnected when their session is expired', () => {
    const record = makeRecord({ sessions: { owner: expiredSession('owner'), viewers: [] } });

    expect(buildPresence(record).ownerConnected).toBe(false);
  });

  it('reports owner as disconnected when there is no owner session', () => {
    const record = makeRecord({ sessions: { owner: null, viewers: [] } });

    expect(buildPresence(record).ownerConnected).toBe(false);
  });

  it('lists only active viewer display names', () => {
    const record = makeRecord({
      sessions: {
        owner: null,
        viewers: [activeSession('Alice'), expiredSession('Bob'), activeSession('Carol')],
      },
    });
    const presence = buildPresence(record);

    expect(presence.viewerNames).toEqual(['Alice', 'Carol']);
    expect(presence.viewerCount).toBe(2);
    expect(presence.viewerConnected).toBe(true);
  });

  it('returns empty viewer list when all viewer sessions are expired', () => {
    const record = makeRecord({
      sessions: { owner: null, viewers: [expiredSession('Alice'), expiredSession('Bob')] },
    });
    const presence = buildPresence(record);

    expect(presence.viewerNames).toEqual([]);
    expect(presence.viewerCount).toBe(0);
    expect(presence.viewerConnected).toBe(false);
  });

  it('returns all-false presence when there are no sessions at all', () => {
    const record = makeRecord({ sessions: { owner: null, viewers: [] } });
    const presence = buildPresence(record);

    expect(presence).toEqual({
      ownerName: 'owner',
      viewerNames: [],
      ownerConnected: false,
      viewerConnected: false,
      viewerCount: 0,
    });
  });
});

// ─── syncUserDocumentLists ───────────────────────────────────────────────────

describe('syncUserDocumentLists', () => {
  it('puts owned documents in the writer list', () => {
    const data = {
      users: [{ username: 'alice', documents: { writer: [], editor: [] } }],
      documentsStore: {
        'doc-1': {
          id: 'doc-1', title: 'My Doc', ownerUsername: 'alice',
          sharedWith: [], updatedAt: '2026-04-28T00:00:00.000Z',
        },
      },
    };

    syncUserDocumentLists(data);

    expect(data.users[0].documents.writer).toEqual([
      { id: 'doc-1', title: 'My Doc', updatedAt: '2026-04-28T00:00:00.000Z' },
    ]);
    expect(data.users[0].documents.editor).toEqual([]);
  });

  it('puts shared documents in the viewer editor list', () => {
    const data = {
      users: [
        { username: 'alice', documents: { writer: [], editor: [] } },
        { username: 'bob', documents: { writer: [], editor: [] } },
      ],
      documentsStore: {
        'doc-1': {
          id: 'doc-1', title: 'Shared', ownerUsername: 'alice',
          sharedWith: ['bob'], updatedAt: '2026-04-28T00:00:00.000Z',
        },
      },
    };

    syncUserDocumentLists(data);

    expect(data.users[1].documents.editor).toEqual([
      { id: 'doc-1', title: 'Shared', updatedAt: '2026-04-28T00:00:00.000Z' },
    ]);
  });

  it('does not put the owner in their own editor list even if in sharedWith', () => {
    const data = {
      users: [{ username: 'alice', documents: { writer: [], editor: [] } }],
      documentsStore: {
        'doc-1': {
          id: 'doc-1', title: 'Doc', ownerUsername: 'alice',
          sharedWith: ['alice'], updatedAt: '2026-04-28T00:00:00.000Z',
        },
      },
    };

    syncUserDocumentLists(data);

    expect(data.users[0].documents.editor).toEqual([]);
  });

  it('removes a document from a user editor list when they are no longer in sharedWith', () => {
    const data = {
      users: [
        { username: 'alice', documents: { writer: [], editor: [] } },
        { username: 'bob', documents: { writer: [], editor: [] } },
      ],
      documentsStore: {
        'doc-1': {
          id: 'doc-1', title: 'Doc', ownerUsername: 'alice',
          sharedWith: [],
          updatedAt: '2026-04-28T00:00:00.000Z',
        },
      },
    };

    syncUserDocumentLists(data);

    expect(data.users[1].documents.editor).toEqual([]);
  });
});
