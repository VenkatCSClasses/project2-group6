// components/CommentsPanel.tsx
import { useEffect, useState } from 'react';
import { createComment, listComments, resolveComment } from '../comments/commentsApi';

export function CommentsPanel({
  documentId,
  selectedBlockId,
  currentUser,
}: {
  documentId: string;
  selectedBlockId?: string;
  currentUser: { id: string; name: string };
}) {
  const [comments, setComments] = useState<any[]>([]);
  const [text, setText] = useState('');

  useEffect(() => {
    listComments(documentId).then(setComments);
  }, [documentId]);

  async function handleAdd() {
    if (!selectedBlockId || !text.trim()) return;
    const newComment = await createComment(documentId, {
      blockId: selectedBlockId,
      text,
      authorId: currentUser.id,
      authorName: currentUser.name,
    });
    setComments((prev) => [...prev, newComment]);
    setText('');
  }

  return (
    <aside>
      <h3>Comments</h3>
      <div>Selected block: {selectedBlockId ?? 'none'}</div>
      <textarea value={text} onChange={(e) => setText(e.target.value)} />
      <button onClick={handleAdd} disabled={!selectedBlockId}>Add comment</button>

      {comments.map((c) => (
        <div key={c.id}>
          <strong>{c.authorName}</strong>: {c.text}
          {!c.resolved && (
            <button onClick={() => resolveComment(documentId, c.id)}>Resolve</button>
          )}
        </div>
      ))}
    </aside>
  );
}