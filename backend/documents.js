const express = require("express");
const fs = require("fs");
const path = require("path");
const { randomUUID } = require("crypto");

const router = express.Router();

const FILE = path.join(__dirname, "accounts.json");
const SESSION_TTL_MS = 30_000;

function nowIso() {
  return new Date().toISOString();
}

function createInviteState() {
  return {
    token: null,
    createdAt: null,
    lastUsedAt: null,
  };
}

function normalizeInvite(invite) {
  if (!invite || typeof invite !== "object") {
    return createInviteState();
  }

  return {
    token: invite.token || null,
    createdAt: invite.createdAt || null,
    lastUsedAt: invite.lastUsedAt || null,
  };
}

function normalizeSharedUsers(sharedWith) {
  if (!Array.isArray(sharedWith)) {
    return [];
  }

  return [...new Set(
    sharedWith
      .map((username) => String(username || "").trim())
      .filter(Boolean),
  )];
}

function readData() {
  const data = JSON.parse(fs.readFileSync(FILE, "utf-8"));
  return normalizeData(data);
}

function writeData(data) {
  syncUserDocumentLists(data);
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

function createDocumentRecord({ id, title, ownerUsername, updatedAt }) {
  return {
    id,
    title: title || "Untitled Document",
    ownerUsername,
    sharedWith: [],
    invite: createInviteState(),
    content: {},
    comments: [],
    updatedAt: updatedAt || nowIso(),
    sessions: {
      owner: null,
      viewers: [],
    },
  };
}

function ensureUserDocumentsShape(user) {
  if (!user.documents || typeof user.documents !== "object") {
    user.documents = { writer: [], editor: [] };
  }

  if (!Array.isArray(user.documents.writer)) {
    user.documents.writer = [];
  }

  if (!Array.isArray(user.documents.editor)) {
    user.documents.editor = [];
  }
}

function normalizeSessionList(sessions) {
  if (!Array.isArray(sessions)) {
    return [];
  }

  return sessions.filter((session) => session && typeof session === "object");
}

function normalizeRecord(record) {
  return {
    ...record,
    title: record.title || "Untitled Document",
    sharedWith: normalizeSharedUsers(
      record.sharedWith ||
        (record.viewerUsername ? [record.viewerUsername] : []),
    ),
    invite: normalizeInvite(record.invite),
    content: record.content && typeof record.content === "object" ? record.content : {},
    comments: Array.isArray(record.comments) ? record.comments : [],
    updatedAt: record.updatedAt || nowIso(),
    sessions: {
      owner: record.sessions?.owner || null,
      viewers: normalizeSessionList(
        record.sessions?.viewers ||
          (record.sessions?.viewer ? [record.sessions.viewer] : []),
      ),
    },
  };
}

function normalizeData(data) {
  if (!Array.isArray(data.users)) {
    data.users = [];
  }

  const documentsStore =
    data.documentsStore && typeof data.documentsStore === "object"
      ? data.documentsStore
      : {};

  for (const user of data.users) {
    ensureUserDocumentsShape(user);

    for (const summary of user.documents.writer) {
      if (!documentsStore[summary.id]) {
        documentsStore[summary.id] = createDocumentRecord({
          id: summary.id,
          title: summary.title,
          ownerUsername: user.username,
          updatedAt: summary.updatedAt,
        });
      }
    }
  }

  for (const user of data.users) {
    for (const summary of user.documents.editor) {
      if (!documentsStore[summary.id]) {
        documentsStore[summary.id] = createDocumentRecord({
          id: summary.id,
          title: summary.title,
          ownerUsername: user.username,
          updatedAt: summary.updatedAt,
        });
      } else if (documentsStore[summary.id].ownerUsername !== user.username) {
        documentsStore[summary.id].sharedWith = normalizeSharedUsers([
          ...(documentsStore[summary.id].sharedWith || []),
          user.username,
        ]);
      }
    }
  }

  for (const [documentId, record] of Object.entries(documentsStore)) {
    documentsStore[documentId] = normalizeRecord(record);
  }

  data.documentsStore = documentsStore;
  syncUserDocumentLists(data);

  return data;
}

function syncUserDocumentLists(data) {
  const summariesByUser = new Map();

  for (const user of data.users) {
    ensureUserDocumentsShape(user);
    summariesByUser.set(user.username, {
      writer: [],
      editor: [],
    });
  }

  for (const record of Object.values(data.documentsStore || {})) {
    const summary = {
      id: record.id,
      title: record.title,
      updatedAt: record.updatedAt,
    };

    if (summariesByUser.has(record.ownerUsername)) {
      summariesByUser.get(record.ownerUsername).writer.push(summary);
    }

    for (const viewerUsername of normalizeSharedUsers(record.sharedWith)) {
      if (
        summariesByUser.has(viewerUsername) &&
        viewerUsername !== record.ownerUsername
      ) {
        summariesByUser.get(viewerUsername).editor.push(summary);
      }
    }
  }

  for (const user of data.users) {
    const nextLists = summariesByUser.get(user.username) || {
      writer: [],
      editor: [],
    };
    user.documents.writer = nextLists.writer;
    user.documents.editor = nextLists.editor;
  }
}

function isActiveSession(session) {
  return Boolean(session) && Date.now() - Date.parse(session.lastSeenAt) < SESSION_TTL_MS;
}

function pruneSessions(record) {
  if (!isActiveSession(record.sessions.owner)) {
    record.sessions.owner = null;
  }

  record.sessions.viewers = normalizeSessionList(record.sessions.viewers).filter(isActiveSession);
}

function buildPresence(record) {
  pruneSessions(record);

  return {
    ownerName: record.ownerUsername,
    viewerNames: record.sessions.viewers.map((session) => session.displayName),
    ownerConnected: Boolean(record.sessions.owner),
    viewerConnected: record.sessions.viewers.length > 0,
    viewerCount: record.sessions.viewers.length,
  };
}

function getDocumentOr404(data, id, res) {
  const record = data.documentsStore[id];
  if (!record) {
    res.status(404).json({ error: "Document not found" });
    return null;
  }

  pruneSessions(record);
  return record;
}

function requireSession(record, sessionId) {
  pruneSessions(record);

  if (!sessionId) {
    return null;
  }

  if (record.sessions.owner?.sessionId === sessionId) {
    return { accessLevel: "owner", session: record.sessions.owner };
  }

  const viewerSession = record.sessions.viewers.find((session) => session.sessionId === sessionId);
  if (viewerSession) {
    return { accessLevel: "viewer", session: viewerSession };
  }

  return null;
}

function documentResponse(record) {
  return {
    id: record.id,
    title: record.title,
    ownerId: record.ownerUsername,
    ownerName: record.ownerUsername,
    ownerUsername: record.ownerUsername,
    sharedWith: normalizeSharedUsers(record.sharedWith),
    content: record.content,
    updatedAt: record.updatedAt,
    presence: buildPresence(record),
  };
}

function inviteResponse(record) {
  return {
    documentId: record.id,
    token: record.invite.token,
    createdAt: record.invite.createdAt,
    lastUsedAt: record.invite.lastUsedAt,
  };
}

router.get("/documents", (req, res) => {
  const { username } = req.query;
  const data = readData();
  const user = data.users.find((entry) => entry.username === username);

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  res.json({
    writerDocs: user.documents.writer,
    editorDocs: user.documents.editor,
  });
});

router.post("/documents", (req, res) => {
  const { username, title } = req.body;
  const data = readData();
  const user = data.users.find((entry) => entry.username === username);

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  const id = randomUUID();
  data.documentsStore[id] = createDocumentRecord({
    id,
    title,
    ownerUsername: username,
  });

  writeData(data);
  res.status(201).json(documentResponse(data.documentsStore[id]));
});

router.post("/documents/:id/viewers", (req, res) => {
  const { sessionId, viewerUsernames } = req.body;
  const data = readData();
  const record = getDocumentOr404(data, req.params.id, res);

  if (!record) {
    return;
  }

  const sessionState = requireSession(record, String(sessionId || ""));

  if (!sessionState || sessionState.accessLevel !== "owner") {
    return res.status(403).json({ error: "Only the file owner can manage access." });
  }

  const requestedUsers = normalizeSharedUsers(viewerUsernames);
  const invalidUsernames = requestedUsers.filter((username) =>
    !data.users.some((entry) => entry.username === username),
  );

  if (invalidUsernames.length > 0) {
    return res.status(404).json({
      error: `Unknown collaborator accounts: ${invalidUsernames.join(", ")}`,
    });
  }

  if (requestedUsers.includes(record.ownerUsername)) {
    return res.status(400).json({ error: "The owner already has access to this file." });
  }

  record.sharedWith = requestedUsers;
  record.sessions.viewers = record.sessions.viewers.filter((viewerSession) =>
    !viewerSession.username || requestedUsers.includes(viewerSession.username),
  );
  writeData(data);
  res.json(documentResponse(record));
});

router.post("/documents/:id/session/claim", (req, res) => {
  const username = String(req.body.username || "").trim();
  const displayName = String(req.body.displayName || username || "").trim();
  const inviteToken = String(req.body.inviteToken || "").trim();
  const requestedSessionId = String(req.body.requestedSessionId || randomUUID());
  const data = readData();
  const record = getDocumentOr404(data, req.params.id, res);

  if (!record) {
    return;
  }

  if (username && username === record.ownerUsername) {
    record.sessions.owner = {
      sessionId: requestedSessionId,
      username,
      displayName: username,
      lastSeenAt: nowIso(),
    };

    writeData(data);
    return res.json({
      sessionId: requestedSessionId,
      accessLevel: "owner",
      displayName: username,
      ownerName: record.ownerUsername,
      documentId: record.id,
    });
  }

  const canJoinAssignedViewer = Boolean(username) && record.sharedWith.includes(username);
  const canJoinByInvite =
    Boolean(inviteToken) && Boolean(record.invite.token) && inviteToken === record.invite.token;

  if (!canJoinAssignedViewer && !canJoinByInvite) {
    return res.status(403).json({ error: "You do not have access to this document." });
  }

  if (!displayName) {
    return res.status(400).json({ error: "Display name is required." });
  }

  const existingIndex = record.sessions.viewers.findIndex(
    (session) => session.sessionId === requestedSessionId,
  );
  const viewerSession = {
    sessionId: requestedSessionId,
    username: username || null,
    displayName,
    lastSeenAt: nowIso(),
  };

  if (existingIndex >= 0) {
    record.sessions.viewers[existingIndex] = viewerSession;
  } else {
    record.sessions.viewers.push(viewerSession);
  }

  if (canJoinByInvite) {
    record.invite.lastUsedAt = nowIso();
  }

  writeData(data);
  res.json({
    sessionId: requestedSessionId,
    accessLevel: "viewer",
    displayName,
    ownerName: record.ownerUsername,
    documentId: record.id,
  });
});

router.post("/documents/:id/session/heartbeat", (req, res) => {
  const data = readData();
  const record = getDocumentOr404(data, req.params.id, res);

  if (!record) {
    return;
  }

  const sessionState = requireSession(record, String(req.body.sessionId || ""));

  if (!sessionState) {
    return res.status(401).json({ error: "Session is no longer active." });
  }

  sessionState.session.lastSeenAt = nowIso();
  writeData(data);
  res.status(204).end();
});

router.post("/documents/:id/session/release", (req, res) => {
  const data = readData();
  const record = getDocumentOr404(data, req.params.id, res);

  if (!record) {
    return;
  }

  const sessionId = String(req.body.sessionId || "");

  if (record.sessions.owner?.sessionId === sessionId) {
    record.sessions.owner = null;
  }

  record.sessions.viewers = record.sessions.viewers.filter(
    (session) => session.sessionId !== sessionId,
  );

  writeData(data);
  res.status(204).end();
});

router.get("/documents/:id/session", (req, res) => {
  const data = readData();
  const record = getDocumentOr404(data, req.params.id, res);

  if (!record) {
    return;
  }

  const sessionState = requireSession(record, String(req.query.sessionId || ""));

  if (!sessionState) {
    return res.status(401).json({ error: "Session is no longer active." });
  }

  sessionState.session.lastSeenAt = nowIso();
  writeData(data);
  res.json(buildPresence(record));
});

router.get("/documents/:id/invite", (req, res) => {
  const data = readData();
  const record = getDocumentOr404(data, req.params.id, res);

  if (!record) {
    return;
  }

  const sessionState = requireSession(record, String(req.query.sessionId || ""));

  if (!sessionState || sessionState.accessLevel !== "owner") {
    return res.status(403).json({ error: "Only the owner can manage invite links." });
  }

  sessionState.session.lastSeenAt = nowIso();
  writeData(data);
  res.json(inviteResponse(record));
});

router.post("/documents/:id/invite", (req, res) => {
  const data = readData();
  const record = getDocumentOr404(data, req.params.id, res);

  if (!record) {
    return;
  }

  const sessionState = requireSession(record, String(req.body.sessionId || ""));

  if (!sessionState || sessionState.accessLevel !== "owner") {
    return res.status(403).json({ error: "Only the owner can manage invite links." });
  }

  record.invite = {
    token: randomUUID(),
    createdAt: nowIso(),
    lastUsedAt: null,
  };
  sessionState.session.lastSeenAt = nowIso();
  writeData(data);
  res.json(inviteResponse(record));
});

router.get("/documents/:id", (req, res) => {
  const data = readData();
  const record = getDocumentOr404(data, req.params.id, res);

  if (!record) {
    return;
  }

  const sessionState = requireSession(record, String(req.query.sessionId || ""));

  if (!sessionState) {
    return res.status(401).json({ error: "Join the document before loading it." });
  }

  sessionState.session.lastSeenAt = nowIso();
  writeData(data);
  res.json(documentResponse(record));
});

router.put("/documents/:id", (req, res) => {
  const data = readData();
  const record = getDocumentOr404(data, req.params.id, res);

  if (!record) {
    return;
  }

  const sessionState = requireSession(record, String(req.body.sessionId || ""));

  if (!sessionState || sessionState.accessLevel !== "owner") {
    return res.status(403).json({ error: "Only the owner can update the document." });
  }

  record.content =
    req.body.content && typeof req.body.content === "object" ? req.body.content : {};
  record.updatedAt = nowIso();
  sessionState.session.lastSeenAt = nowIso();
  writeData(data);
  res.json(documentResponse(record));
});

router.get("/documents/:id/comments", (req, res) => {
  const data = readData();
  const record = getDocumentOr404(data, req.params.id, res);

  if (!record) {
    return;
  }

  const sessionState = requireSession(record, String(req.query.sessionId || ""));

  if (!sessionState) {
    return res.status(401).json({ error: "Join the document before loading comments." });
  }

  sessionState.session.lastSeenAt = nowIso();
  writeData(data);
  res.json(record.comments);
});

router.post("/documents/:id/comments", (req, res) => {
  const data = readData();
  const record = getDocumentOr404(data, req.params.id, res);

  if (!record) {
    return;
  }

  const sessionState = requireSession(record, String(req.body.sessionId || ""));

  if (!sessionState) {
    return res.status(401).json({ error: "Join the document before commenting." });
  }

  const text = String(req.body.text || "").trim();

  if (!text) {
    return res.status(400).json({ error: "Comment text is required." });
  }

  sessionState.session.lastSeenAt = nowIso();

  const comment = {
    id: randomUUID(),
    documentId: record.id,
    text,
    authorId: sessionState.session.sessionId,
    authorName: sessionState.session.displayName,
    authorRole: sessionState.accessLevel,
    sectionLabel: String(req.body.sectionLabel || "").trim() || undefined,
    resolved: false,
    createdAt: nowIso(),
  };

  record.comments.unshift(comment);
  writeData(data);
  res.status(201).json(comment);
});

router.post("/documents/:id/comments/:commentId/resolve", (req, res) => {
  const data = readData();
  const record = getDocumentOr404(data, req.params.id, res);

  if (!record) {
    return;
  }

  const sessionState = requireSession(record, String(req.body.sessionId || ""));

  if (!sessionState || sessionState.accessLevel !== "owner") {
    return res.status(403).json({ error: "Only the owner can resolve comments." });
  }

  const comment = record.comments.find((entry) => entry.id === req.params.commentId);

  if (!comment) {
    return res.status(404).json({ error: "Comment not found." });
  }

  comment.resolved = true;
  sessionState.session.lastSeenAt = nowIso();
  writeData(data);
  res.status(204).end();
});

module.exports = router;
