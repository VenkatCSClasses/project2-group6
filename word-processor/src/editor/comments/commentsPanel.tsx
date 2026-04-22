import { useEffect, useRef, useState } from 'react';
import { createComment, listComments, resolveComment } from './commentsApi';
import type { DocumentComment } from './types';

export function CommentsPanel({
  documentId,
  sessionId,
  canResolveComments,
  onAfterResolve,
}: {
  documentId: string;
  sessionId: string;
  canResolveComments: boolean;
  onAfterResolve?: (commentId: string) => void;
}) {
  const [comments, setComments] = useState<DocumentComment[]>([]);
  const [text, setText] = useState('');
  const [focusedCommentId, setFocusedCommentId] = useState<string | null>(null);
  const focusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cardRefs = useRef<Map<string, HTMLElement>>(new Map());

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

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const span = (e.target as HTMLElement).closest('[data-comment-id]');
      if (!span) return;
      const commentId = span.getAttribute('data-comment-id');
      if (!commentId) return;

      const card = cardRefs.current.get(commentId);
      card?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

      setFocusedCommentId(commentId);
      if (focusTimerRef.current) clearTimeout(focusTimerRef.current);
      focusTimerRef.current = setTimeout(() => setFocusedCommentId(null), 2000);
    };

    document.addEventListener('click', handler);
    return () => {
      document.removeEventListener('click', handler);
      if (focusTimerRef.current) clearTimeout(focusTimerRef.current);
    };
  }, []);

  function scrollToHighlight(commentId: string) {
    const span = window.document.querySelector(`[data-comment-id="${commentId}"]`);
    if (!span) return;
    span.scrollIntoView({ behavior: 'smooth', block: 'center' });
    span.classList.add('comment-highlight-flash');
    setTimeout(() => span.classList.remove('comment-highlight-flash'), 1600);
  }

  async function handleAdd() {
    if (!text.trim()) {
      return;
    }

    const newComment = await createComment({
      documentId,
      sessionId,
      text,
    });

    setComments((prev) => [newComment, ...prev]);
    setText('');
  }

  async function handleResolve(commentId: string) {
    await resolveComment(documentId, commentId, sessionId);
    setComments((prev) =>
      prev.map((comment) =>
        comment.id === commentId ? { ...comment, resolved: true } : comment,
      ),
    );
    onAfterResolve?.(commentId);
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

      <div className="comment-form">
        <label>
          General comment
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Leave feedback for the editor (or highlight text in the document to anchor a comment)"
          />
        </label>
        <button className="primary-button" onClick={() => void handleAdd()}>
          Add comment
        </button>
      </div>

      <div className="comment-list">
        {comments.length === 0 ? (
          <p className="empty-state">No comments yet.</p>
        ) : (
          comments.map((comment) => (
            <article
              key={comment.id}
              ref={(el) => {
                if (el) cardRefs.current.set(comment.id, el);
                else cardRefs.current.delete(comment.id);
              }}
              className={`comment-card ${comment.resolved ? 'is-resolved' : ''} ${focusedCommentId === comment.id ? 'is-focused' : ''}`}
            >
              <div className="comment-card-header">
                <strong>{comment.authorName}</strong>
                <span>{new Date(comment.createdAt).toLocaleString()}</span>
              </div>
              {comment.selectedText ? (
                <blockquote
                  className="comment-quote comment-quote-link"
                  title="Click to locate in document"
                  onClick={() => scrollToHighlight(comment.id)}
                >
                  &ldquo;{comment.selectedText}&rdquo;
                </blockquote>
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
