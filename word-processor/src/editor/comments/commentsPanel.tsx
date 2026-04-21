import { useEffect, useState } from 'react';
import type { AccessLevel } from '../collaboration/types';
import { createComment, listComments, resolveComment } from './commentsApi';
import type { DocumentComment } from './types';

export function CommentsPanel({
  documentId,
  sessionId,
  accessLevel,
  canResolveComments,
}: {
  documentId: string;
  sessionId: string;
  accessLevel: AccessLevel;
  canResolveComments: boolean;
}) {
  const [comments, setComments] = useState<DocumentComment[]>([]);
  const [text, setText] = useState('');
  const [sectionLabel, setSectionLabel] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadComments = async () => {
      try {
        const nextComments = await listComments(documentId, sessionId);
        if (isMounted) {
          setComments(nextComments);
        }
      } catch {
        if (isMounted) {
          setComments([]);
        }
      }
    };

    void loadComments();
    const intervalId = window.setInterval(() => {
      void loadComments();
    }, 3000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [documentId, sessionId]);

  async function handleAdd() {
    if (accessLevel !== 'viewer' || !text.trim()) {
      return;
    }

    const newComment = await createComment({
      documentId,
      sessionId,
      text,
      sectionLabel,
    });

    setComments((prev) => [newComment, ...prev]);
    setText('');
    setSectionLabel('');
  }

  async function handleResolve(commentId: string) {
    await resolveComment(documentId, commentId, sessionId);
    setComments((prev) =>
      prev.map((comment) =>
        comment.id === commentId ? { ...comment, resolved: true } : comment,
      ),
    );
  }

  return (
    <aside className="comments-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Review Queue</p>
          <h3>Comments</h3>
        </div>
        <span className="count-badge">{comments.length}</span>
      </div>

      {accessLevel === 'viewer' ? (
        <div className="comment-form">
          <label>
            Section reference
            <input
              value={sectionLabel}
              onChange={(event) => setSectionLabel(event.target.value)}
              placeholder="Lead, quote section, ending..."
            />
          </label>
          <label>
            Reviewer note
            <textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="Leave feedback for the editor"
            />
          </label>
          <button className="primary-button" onClick={handleAdd}>
            Add comment
          </button>
        </div>
      ) : (
        <p className="panel-note">
          The active viewer leaves comments here. The file owner can resolve them
          after updating the draft.
        </p>
      )}

      <div className="comment-list">
        {comments.length === 0 ? (
          <p className="empty-state">No comments yet.</p>
        ) : (
          comments.map((comment) => (
            <article
              key={comment.id}
              className={`comment-card ${comment.resolved ? 'is-resolved' : ''}`}
            >
              <div className="comment-card-header">
                <strong>{comment.authorName}</strong>
                <span>{new Date(comment.createdAt).toLocaleString()}</span>
              </div>
              {comment.sectionLabel ? (
                <p className="comment-section">{comment.sectionLabel}</p>
              ) : null}
              <p>{comment.text}</p>
              {!comment.resolved && canResolveComments ? (
                <button
                  className="secondary-button"
                  onClick={() => void handleResolve(comment.id)}
                >
                  Resolve
                </button>
              ) : null}
              {comment.resolved ? (
                <span className="resolved-pill">Resolved</span>
              ) : null}
            </article>
          ))
        )}
      </div>
    </aside>
  );
}
