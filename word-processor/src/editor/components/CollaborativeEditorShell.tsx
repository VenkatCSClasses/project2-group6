import { useEffect, useMemo, useRef, useState } from 'react';
import YooptaEditor, {
  Blocks,
  Marks,
  useYooptaEditor,
  type YooptaContentValue,
} from '@yoopta/editor';
import { Editor, Text, Transforms } from 'slate';
import { RemoteCursors } from '@yoopta/collaboration';
import {
  BlockOptions,
  FloatingBlockActions,
  SlashCommandMenu,
  ActionMenuList,
  useBlockActions,
} from '@yoopta/ui';
// ActionMenuList is used in EditorBlockActions (block-level "Turn into"), not in FixedToolbar
import { createCollaborativeEditor } from '../collaboration/createCollaborativeEditor';
import { createBaseEditor } from '../createBaseEditor';
import { FloatingCommentButton } from '../comments/FloatingCommentButton';
import type { CommentAnchor } from '../comments/types';

type CommentLeaf = {
  text: string;
  commentHighlight?: { commentId: string; deleted?: boolean };
};

function FixedToolbar() {
  const editor = useYooptaEditor();

  const markButtons = [
    { type: 'bold', label: 'B', title: 'Bold' },
    { type: 'italic', label: 'I', title: 'Italic' },
    { type: 'underline', label: 'U', title: 'Underline' },
    { type: 'strike', label: 'S', title: 'Strikethrough' },
    { type: 'code', label: '</>', title: 'Code' },
    { type: 'highlight', label: 'H', title: 'Highlight' },
  ];

  return (
    <div className="editor-toolbar" role="toolbar" aria-label="Formatting toolbar">
      {markButtons.map((btn) => {
        if (!editor.formats[btn.type]) return null;
        return (
          <button
            key={btn.type}
            type="button"
            className={`editor-toolbar-button ${Marks.isActive(editor, { type: btn.type }) ? 'is-active' : ''}`}
            onClick={() => Marks.toggle(editor, { type: btn.type })}
            title={btn.title}
          >
            {btn.label}
          </button>
        );
      })}

      <span className="editor-toolbar-separator" />

      <button
        type="button"
        className="editor-toolbar-button"
        onClick={() => Marks.clear(editor)}
        title="Clear formatting"
      >
        Clear
      </button>
    </div>
  );
}

function EditorBlockActions() {
  const editor = useYooptaEditor();
  const { duplicateBlock, copyBlockLink, deleteBlock } = useBlockActions();
  const [blockOptionsOpen, setBlockOptionsOpen] = useState(false);
  const optionsButtonRef = useRef<HTMLButtonElement>(null);
  const turnIntoRef = useRef<HTMLButtonElement>(null);
  const [actionMenuOpen, setActionMenuOpen] = useState(false);

  return (
    <FloatingBlockActions frozen={blockOptionsOpen || actionMenuOpen}>
      {({ blockId }: { blockId?: string | null }) => (
        <>
          <FloatingBlockActions.Button
            onClick={() => {
              if (!blockId) return;
              const block = Blocks.getBlock(editor, { id: blockId });
              if (block) {
                editor.insertBlock('Paragraph', { at: block.meta.order + 1, focus: true });
              }
            }}
          >
            +
          </FloatingBlockActions.Button>

          <FloatingBlockActions.Button title="Drag to reorder (coming soon)">
            ::
          </FloatingBlockActions.Button>

          <FloatingBlockActions.Button
            ref={optionsButtonRef}
            onClick={() => setBlockOptionsOpen((prev) => !prev)}
            title="Block options"
          >
            ···
          </FloatingBlockActions.Button>

          <BlockOptions
            open={blockOptionsOpen}
            onOpenChange={setBlockOptionsOpen}
            anchor={optionsButtonRef.current}
          >
            <BlockOptions.Content>
              <BlockOptions.Item label="Turn into" ref={turnIntoRef} onClick={() => setActionMenuOpen(true)} />
              <BlockOptions.Item label="Duplicate" onClick={() => { duplicateBlock({ blockId: blockId ?? '' }); setBlockOptionsOpen(false); }} />
              <BlockOptions.Item label="Copy link" onClick={() => { copyBlockLink({ blockId: blockId ?? '' }); setBlockOptionsOpen(false); }} />
              <BlockOptions.Item label="Delete" onClick={() => { deleteBlock({ blockId: blockId ?? '' }); setBlockOptionsOpen(false); }} />
            </BlockOptions.Content>
          </BlockOptions>

          <ActionMenuList
            open={actionMenuOpen}
            onOpenChange={(open) => { setActionMenuOpen(open); if (!open) setBlockOptionsOpen(false); }}
            anchor={turnIntoRef.current}
            view="small"
            placement="right-start"
          >
            <ActionMenuList.Content />
          </ActionMenuList>
        </>
      )}
    </FloatingBlockActions>
  );
}


export function CollaborativeEditorShell({
  documentId,
  currentUser,
  websocketUrl,
  savedContent,
  readOnly,
  onChange,
  onComment,
  resolvedCommentIds = [],
}: {
  documentId: string;
  currentUser: { id: string; name: string; color: string; avatar?: string };
  websocketUrl: string | null;
  savedContent: YooptaContentValue;
  readOnly: boolean;
  onChange?: (value: YooptaContentValue) => Promise<void> | void;
  onComment?: (
    commentId: string,
    text: string,
    selectedText: string,
    anchor?: CommentAnchor,
  ) => void | Promise<void>;
  resolvedCommentIds?: string[];
}) {
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRealtimeEnabled = Boolean(websocketUrl);
  const seenResolvedRef = useRef<Set<string>>(new Set());

  const editor = useMemo(() => {
    if (!isRealtimeEnabled || !websocketUrl) {
      return createBaseEditor({ value: savedContent, readOnly });
    }

    return createCollaborativeEditor({
      roomId: documentId,
      user: currentUser,
      websocketUrl,
      savedContent,
      readOnly,
    });
  }, [currentUser, documentId, isRealtimeEnabled, readOnly, savedContent, websocketUrl]);

  useEffect(() => {
    const collaborativeEditor = editor as {
      collaboration?: { connect: () => void; destroy: () => void };
    };
    const collaboration = collaborativeEditor.collaboration;

    if (!collaboration || !isRealtimeEnabled) return undefined;

    collaboration.connect();
    return () => { collaboration.destroy(); };
  }, [editor, isRealtimeEnabled]);

  useEffect(
    () => () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    },
    [],
  );

  // Strip resolved comment marks from all per-block Slate editors.
  useEffect(() => {
    const newlyResolved = resolvedCommentIds.filter(
      (id) => !seenResolvedRef.current.has(id),
    );

    if (newlyResolved.length === 0) return;

    for (const resolvedId of newlyResolved) {
      seenResolvedRef.current.add(resolvedId);
    }

    for (const slateEditor of Object.values(editor.blockEditorsMap)) {
      const toDelete: import('slate').Path[] = [];

      for (const [node, path] of Editor.nodes(slateEditor, {
        at: [],
        match: (n) => {
          const leaf = n as CommentLeaf;
          return (
            Text.isText(n) &&
            !!leaf.commentHighlight &&
            newlyResolved.includes(leaf.commentHighlight.commentId)
          );
        },
      })) {
        const leaf = node as CommentLeaf;
        if (leaf.commentHighlight?.deleted) {
          toDelete.push(path);
        } else {
          Transforms.unsetNodes(slateEditor, 'commentHighlight', { at: path });
        }
      }

      for (const path of [...toDelete].reverse()) {
        Transforms.removeNodes(slateEditor, { at: path });
      }
    }

    if (onChange) {
      const updated = editor.getEditorValue();
      void Promise.resolve(onChange(updated));
    }
  }, [resolvedCommentIds, editor, onChange]);

  const handleChange = readOnly
    ? undefined
    : (value: YooptaContentValue) => {
        if (!onChange) return;

        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

        saveTimerRef.current = setTimeout(() => {
          void onChange(value);
        }, 400);
      };

  return (
    <YooptaEditor
      editor={editor}
      autoFocus={!readOnly}
      onChange={handleChange}
      placeholder={readOnly ? 'Reviewer mode' : 'Start writing'}
      className="editor-surface"
    >
      {!readOnly ? <FixedToolbar /> : null}
      {!readOnly ? <EditorBlockActions /> : null}
      {!readOnly ? <SlashCommandMenu /> : null}
      {onComment ? (
        <FloatingCommentButton onComment={onComment} readOnly={readOnly} />
      ) : null}
      {isRealtimeEnabled ? <RemoteCursors /> : null}
    </YooptaEditor>
  );
}
