import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const host = process.env.COLLAB_HOST || '0.0.0.0';
const port = Number(process.env.COLLAB_PORT || 4000);
const ownerKey = process.env.COLLAB_OWNER_KEY || 'creator-key';
const ownerName = process.env.COLLAB_OWNER_NAME || 'File Creator';
const sessionTtlMs = 30_000;
const storePath = resolve(__dirname, 'data', 'store.json');

function ensureStore() {
  if (!existsSync(storePath)) {
    mkdirSync(dirname(storePath), { recursive: true });
    writeFileSync(storePath, JSON.stringify({ documents: {} }, null, 2));
  }
}

function readStore() {
  ensureStore();
  return JSON.parse(readFileSync(storePath, 'utf8'));
}

function writeStore(store) {
  writeFileSync(storePath, JSON.stringify(store, null, 2));
}

function nowIso() {
  return new Date().toISOString();
}

function createDocument(documentId) {
  return {
    id: documentId,
    title: 'City Council Feature',
    ownerId: 'owner',
    ownerName,
    ownerKey,
    content: {},
    comments: [],
    updatedAt: nowIso(),
    sessions: {
      owner: null,
      viewer: null,
    },
  };
}

function getDocumentRecord(store, documentId) {
  if (!store.documents[documentId]) {
    store.documents[documentId] = createDocument(documentId);
  }

  return store.documents[documentId];
}

function isActiveSession(session) {
  if (!session) {
    return false;
  }

  return Date.now() - Date.parse(session.lastSeenAt) < sessionTtlMs;
}

function pruneSessions(document) {
  if (!isActiveSession(document.sessions.owner)) {
    document.sessions.owner = null;
  }

  if (!isActiveSession(document.sessions.viewer)) {
    document.sessions.viewer = null;
  }
}

function getPresence(document) {
  pruneSessions(document);

  return {
    ownerName: document.ownerName,
    ownerConnected: Boolean(document.sessions.owner),
    viewerName: document.sessions.viewer?.displayName ?? null,
    viewerConnected: Boolean(document.sessions.viewer),
  };
}

function toDocumentResponse(document) {
  return {
    id: document.id,
    title: document.title,
    ownerId: document.ownerId,
    ownerName: document.ownerName,
    content: document.content,
    updatedAt: document.updatedAt,
    presence: getPresence(document),
  };
}

async function readJson(request) {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(chunk);
  }

  if (chunks.length === 0) {
    return {};
  }

  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json',
  });

  if (statusCode === 204) {
    response.end();
    return;
  }

  response.end(JSON.stringify(payload));
}

function parseRoute(requestUrl) {
  const url = new URL(requestUrl, `http://${host}:${port}`);
  const parts = url.pathname.split('/').filter(Boolean);

  return { url, parts };
}

function requireSession(document, sessionId) {
  pruneSessions(document);

  if (!sessionId) {
    return null;
  }

  if (document.sessions.owner?.sessionId === sessionId) {
    return { accessLevel: 'owner', session: document.sessions.owner };
  }

  if (document.sessions.viewer?.sessionId === sessionId) {
    return { accessLevel: 'viewer', session: document.sessions.viewer };
  }

  return null;
}

const server = createServer(async (request, response) => {
  try {
    if (!request.url || !request.method) {
      sendJson(response, 400, { error: 'Invalid request.' });
      return;
    }

    const { url, parts } = parseRoute(request.url);

    if (request.method === 'GET' && url.pathname === '/api/health') {
      sendJson(response, 200, { ok: true });
      return;
    }

    if (parts[0] !== 'api' || parts[1] !== 'documents' || !parts[2]) {
      sendJson(response, 404, { error: 'Route not found.' });
      return;
    }

    const documentId = parts[2];
    const store = readStore();
    const document = getDocumentRecord(store, documentId);
    pruneSessions(document);

    if (request.method === 'POST' && parts[3] === 'session' && parts[4] === 'claim') {
      const body = await readJson(request);
      const accessLevel = body.accessLevel;
      const displayName = String(body.displayName || '').trim();
      const requestedSessionId = String(body.requestedSessionId || crypto.randomUUID());

      if (!displayName) {
        sendJson(response, 400, { error: 'Display name is required.' });
        return;
      }

      if (accessLevel === 'owner') {
        if (body.ownerKey !== document.ownerKey) {
          sendJson(response, 403, { error: 'Owner key is incorrect.' });
          return;
        }

        if (document.sessions.owner && document.sessions.owner.sessionId !== requestedSessionId) {
          sendJson(response, 409, { error: 'The owner is already connected.' });
          return;
        }

        document.sessions.owner = {
          sessionId: requestedSessionId,
          displayName,
          lastSeenAt: nowIso(),
        };
      } else if (accessLevel === 'viewer') {
        if (document.sessions.viewer && document.sessions.viewer.sessionId !== requestedSessionId) {
          sendJson(response, 409, { error: 'A viewer is already connected to this file.' });
          return;
        }

        document.sessions.viewer = {
          sessionId: requestedSessionId,
          displayName,
          lastSeenAt: nowIso(),
        };
      } else {
        sendJson(response, 400, { error: 'Unsupported access level.' });
        return;
      }

      writeStore(store);
      sendJson(response, 200, {
        sessionId: requestedSessionId,
        accessLevel,
        displayName,
        ownerName: document.ownerName,
        documentId,
      });
      return;
    }

    if (request.method === 'POST' && parts[3] === 'session' && parts[4] === 'heartbeat') {
      const body = await readJson(request);
      const sessionState = requireSession(document, String(body.sessionId || ''));

      if (!sessionState) {
        sendJson(response, 401, { error: 'Session is no longer active.' });
        return;
      }

      sessionState.session.lastSeenAt = nowIso();
      writeStore(store);
      sendJson(response, 204, {});
      return;
    }

    if (request.method === 'POST' && parts[3] === 'session' && parts[4] === 'release') {
      const body = await readJson(request);
      const sessionId = String(body.sessionId || '');

      if (document.sessions.owner?.sessionId === sessionId) {
        document.sessions.owner = null;
      }

      if (document.sessions.viewer?.sessionId === sessionId) {
        document.sessions.viewer = null;
      }

      writeStore(store);
      sendJson(response, 204, {});
      return;
    }

    if (request.method === 'GET' && parts[3] === 'session') {
      const sessionState = requireSession(
        document,
        url.searchParams.get('sessionId') || '',
      );

      if (!sessionState) {
        sendJson(response, 401, { error: 'Session is no longer active.' });
        return;
      }

      sessionState.session.lastSeenAt = nowIso();
      writeStore(store);
      sendJson(response, 200, getPresence(document));
      return;
    }

    if (request.method === 'GET' && parts.length === 3) {
      const sessionState = requireSession(
        document,
        url.searchParams.get('sessionId') || '',
      );

      if (!sessionState) {
        sendJson(response, 401, { error: 'Join the file before loading it.' });
        return;
      }

      sessionState.session.lastSeenAt = nowIso();
      writeStore(store);
      sendJson(response, 200, toDocumentResponse(document));
      return;
    }

    if (request.method === 'PUT' && parts.length === 3) {
      const body = await readJson(request);
      const sessionState = requireSession(document, String(body.sessionId || ''));

      if (!sessionState || sessionState.accessLevel !== 'owner') {
        sendJson(response, 403, { error: 'Only the file owner can update this draft.' });
        return;
      }

      document.content = body.content || {};
      document.updatedAt = nowIso();
      sessionState.session.lastSeenAt = nowIso();
      writeStore(store);
      sendJson(response, 200, toDocumentResponse(document));
      return;
    }

    if (request.method === 'GET' && parts[3] === 'comments' && parts.length === 4) {
      const sessionState = requireSession(
        document,
        url.searchParams.get('sessionId') || '',
      );

      if (!sessionState) {
        sendJson(response, 401, { error: 'Join the file before loading comments.' });
        return;
      }

      sessionState.session.lastSeenAt = nowIso();
      writeStore(store);
      sendJson(response, 200, document.comments);
      return;
    }

    if (request.method === 'POST' && parts[3] === 'comments' && parts.length === 4) {
      const body = await readJson(request);
      const sessionState = requireSession(document, String(body.sessionId || ''));

      if (!sessionState) {
        sendJson(response, 401, { error: 'Join the file before commenting.' });
        return;
      }

      const text = String(body.text || '').trim();
      if (!text) {
        sendJson(response, 400, { error: 'Comment text is required.' });
        return;
      }

      sessionState.session.lastSeenAt = nowIso();

      const comment = {
        id: crypto.randomUUID(),
        documentId,
        text,
        authorId: sessionState.session.sessionId,
        authorName: sessionState.session.displayName,
        authorRole: sessionState.accessLevel,
        sectionLabel: String(body.sectionLabel || '').trim() || undefined,
        resolved: false,
        createdAt: nowIso(),
      };

      document.comments.unshift(comment);
      writeStore(store);
      sendJson(response, 200, comment);
      return;
    }

    if (
      request.method === 'POST' &&
      parts[3] === 'comments' &&
      parts[5] === 'resolve' &&
      parts[4]
    ) {
      const body = await readJson(request);
      const sessionState = requireSession(document, String(body.sessionId || ''));

      if (!sessionState || sessionState.accessLevel !== 'owner') {
        sendJson(response, 403, { error: 'Only the file owner can resolve comments.' });
        return;
      }

      const comment = document.comments.find((entry) => entry.id === parts[4]);
      if (!comment) {
        sendJson(response, 404, { error: 'Comment not found.' });
        return;
      }

      comment.resolved = true;
      sessionState.session.lastSeenAt = nowIso();
      writeStore(store);
      sendJson(response, 204, {});
      return;
    }

    sendJson(response, 404, { error: 'Route not found.' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown server error.';
    sendJson(response, 500, { error: message });
  }
});

server.listen(port, host, () => {
  console.log(`Collaboration server listening on http://${host}:${port}`);
});
