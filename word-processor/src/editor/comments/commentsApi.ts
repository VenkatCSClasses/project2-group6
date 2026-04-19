// comments/commentsApi.ts
export async function listComments(documentId: string) {
  const res = await fetch(`/api/documents/${documentId}/comments`);
  return res.json();
}

export async function createComment(documentId: string, payload: {
  blockId: string;
  text: string;
  authorId: string;
  authorName: string;
}) {
  const res = await fetch(`/api/documents/${documentId}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function resolveComment(documentId: string, commentId: string) {
  await fetch(`/api/documents/${documentId}/comments/${commentId}/resolve`, {
    method: 'POST',
  });
}