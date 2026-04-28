import { useState, useEffect, useRef } from 'react';
import { Marks, useYooptaEditor, type YooptaPath } from '@yoopta/editor';
import { Range, type Range as SlateRange } from 'slate';
import type { CommentAnchor } from './types';

type Props = {
  readOnly?: boolean;
  onComment: (
    commentId: string,
    text: string,
    selectedText: string,
    anchor?: CommentAnchor,
  ) => void | Promise<void>;
};

type SelectionCapture = {
  slateRange: SlateRange | null;
  blockOrder: number | null;
  blockId: string;
  selectedText: string;
  rect: DOMRect;
};

function generateId(): string {
  if (typeof crypto?.randomUUID === 'function') return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function FloatingCommentButton({ onComment, readOnly }: Props) {
  const editor = useYooptaEditor();
  const [capture, setCapture] = useState<SelectionCapture | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const savedRef = useRef<SelectionCapture | null>(null);
  const formOpenRef = useRef(false);
  const latestPathRef = useRef<YooptaPath | null>(null);

  useEffect(() => {
    formOpenRef.current = formOpen;
  }, [formOpen]);

  // Track the latest Yoopta path so selectionchange can access block info in edit mode
  useEffect(() => {
    if (readOnly) return;
    const update = (path: YooptaPath) => { latestPathRef.current = path; };
    editor.on('path-change', update);
    return () => editor.off('path-change', update);
  }, [editor, readOnly]);

  // selectionchange fires on all platforms (desktop mouse, mobile touch) whenever
  // the selection changes, making it the single reliable hook for both modes.
  useEffect(() => {
    const handleSelectionChange = () => {
      if (formOpenRef.current) return;

      const domSel = window.getSelection();
      if (!domSel || domSel.isCollapsed || domSel.rangeCount === 0) {
        setCapture(null);
        return;
      }

      const selectedText = domSel.toString().trim();
      if (!selectedText) {
        setCapture(null);
        return;
      }

      // Only react to selections inside the editor surface
      const anchorNode = domSel.anchorNode;
      const parentEl = anchorNode instanceof Element ? anchorNode : anchorNode?.parentElement;
      if (!parentEl?.closest('.editor-surface')) {
        setCapture(null);
        return;
      }

      const rect = domSel.getRangeAt(0).getBoundingClientRect();
      if (!rect.width) return;

      if (!readOnly) {
        const path = latestPathRef.current;
        if (!path?.selection || Range.isCollapsed(path.selection)) {
          setCapture(null);
          return;
        }
        const content = editor.getEditorValue();
        const blockEntry = Object.entries(content).find(
          ([, block]) => block.meta.order === path.current,
        );
        if (!blockEntry) return;
        setCapture({
          slateRange: path.selection as SlateRange,
          blockOrder: path.current ?? 0,
          blockId: blockEntry[0],
          selectedText,
          rect,
        });
      } else {
        setCapture({ slateRange: null, blockOrder: null, blockId: '', selectedText, rect });
      }
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, [editor, readOnly]);

  function openForm() {
    savedRef.current = capture;
    setFormOpen(true);
  }

  function close() {
    setFormOpen(false);
    setCommentText('');
    setCapture(null);
    savedRef.current = null;
  }

  async function submit() {
    const saved = savedRef.current;
    if (!saved || !commentText.trim()) return;

    setSubmitting(true);

    try {
      const commentId = generateId();

      // Marks can only be applied in edit mode (read-only editors reject writes)
      if (!readOnly && saved.slateRange !== null && saved.blockOrder !== null) {
        Marks.add(editor, {
          type: 'commentHighlight',
          value: { commentId, deleted: false },
          at: saved.blockOrder,
          selection: saved.slateRange,
        });
      }

      const anchor: CommentAnchor | undefined =
        saved.slateRange !== null && saved.blockOrder !== null
          ? {
              blockId: saved.blockId,
              anchor: saved.slateRange.anchor,
              focus: saved.slateRange.focus,
            }
          : undefined;

      await onComment(commentId, commentText.trim(), saved.selectedText, anchor);
    } finally {
      setSubmitting(false);
      close();
    }
  }

  const displayRect = (savedRef.current ?? capture)?.rect;

  if ((!capture && !formOpen) || !displayRect) return null;

  const top = displayRect.bottom + 8;
  const left = displayRect.left + displayRect.width / 2;

  const containerStyle: React.CSSProperties = {
    position: 'fixed',
    top,
    left,
    transform: 'translateX(-50%)',
    zIndex: 1000,
    background: '#1e293b',
    borderRadius: '6px',
    padding: formOpen ? '10px' : '4px 10px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.35)',
    minWidth: formOpen ? '270px' : undefined,
  };

  if (!formOpen) {
    return (
      <div style={containerStyle} onMouseDown={(e) => e.preventDefault()}>
        <button
          style={{
            background: 'none',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            fontSize: '13px',
            padding: 0,
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            openForm();
          }}
        >
          💬 Add comment
        </button>
      </div>
    );
  }

  return (
    <div style={containerStyle} onMouseDown={(e) => e.preventDefault()}>
      {savedRef.current && (
        <p
          style={{
            color: '#94a3b8',
            fontSize: '12px',
            margin: '0 0 6px',
            fontStyle: 'italic',
            maxWidth: '250px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          &ldquo;{savedRef.current.selectedText}&rdquo;
        </p>
      )}
      <textarea
        autoFocus
        value={commentText}
        onChange={(e) => setCommentText(e.target.value)}
        placeholder="Add a comment… (Ctrl+Enter to save)"
        rows={3}
        style={{
          width: '100%',
          borderRadius: '4px',
          border: '1px solid #475569',
          padding: '6px',
          background: '#0f172a',
          color: 'white',
          resize: 'none',
          fontSize: '13px',
          boxSizing: 'border-box',
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void submit();
          if (e.key === 'Escape') close();
        }}
      />
      <div
        style={{
          display: 'flex',
          gap: '6px',
          marginTop: '6px',
          justifyContent: 'flex-end',
        }}
      >
        <button
          style={{
            background: '#334155',
            border: 'none',
            color: 'white',
            borderRadius: '4px',
            padding: '4px 10px',
            cursor: 'pointer',
            fontSize: '13px',
          }}
          onClick={close}
        >
          Cancel
        </button>
        <button
          disabled={submitting || !commentText.trim()}
          style={{
            background: '#2563eb',
            border: 'none',
            color: 'white',
            borderRadius: '4px',
            padding: '4px 10px',
            cursor: submitting || !commentText.trim() ? 'default' : 'pointer',
            fontSize: '13px',
            opacity: submitting || !commentText.trim() ? 0.6 : 1,
          }}
          onClick={() => void submit()}
        >
          {submitting ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
}
