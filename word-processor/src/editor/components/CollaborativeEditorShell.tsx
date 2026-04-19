// components/CollaborativeEditorShell.tsx
import { useEffect, useMemo, useCallback } from 'react';
import YooptaEditor from '@yoopta/editor';
import { RemoteCursors } from '@yoopta/collaboration';
import { createCollaborativeEditor } from '../collaboration/createCollaborativeEditor';

function debounce<T extends (...args: any[]) => void>(fn: T, wait: number) {
  let t: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

export function CollaborativeEditorShell({
  documentId,
  currentUser,
  savedContent,
}: {
  documentId: string;
  currentUser: { id: string; name: string; color: string; avatar?: string };
  savedContent?: any;
}) {
  const editor = useMemo(
    () =>
      createCollaborativeEditor({
        roomId: documentId,
        user: currentUser,
        savedContent,
      }),
    [documentId, currentUser, savedContent]
  );

  useEffect(() => {
    editor.collaboration.connect();
    return () => editor.collaboration.destroy();
  }, [editor]);

  const handleChange = useCallback(
    debounce(async (value: any) => {
      await fetch(`/api/documents/${documentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: value }),
      });
    }, 1500),
    [documentId]
  );

  return (
    <YooptaEditor editor={editor} onChange={handleChange}>
      <RemoteCursors />
    </YooptaEditor>
  );
}