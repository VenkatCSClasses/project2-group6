import { useEffect, useMemo, useRef } from 'react';
import YooptaEditor, {
  Blocks,
  Marks,
  useYooptaEditor,
  type YooptaContentValue,
} from '@yoopta/editor';
import { RemoteCursors } from '@yoopta/collaboration';
import {
  BlockOptions,
  FloatingBlockActions,
  FloatingToolbar,
  SlashCommandMenu,
} from '@yoopta/ui';
import { createCollaborativeEditor } from '../collaboration/createCollaborativeEditor';
import { createBaseEditor } from '../createBaseEditor';

function EditorToolbar() {
  const editor = useYooptaEditor();

  return (
    <FloatingToolbar>
      <FloatingToolbar.Content>
        <FloatingToolbar.Group>
          <FloatingToolbar.Button
            onClick={() => Marks.toggle(editor, { type: 'bold' })}
            active={Marks.isActive(editor, { type: 'bold' })}
            title="Bold"
          >
            B
          </FloatingToolbar.Button>
          <FloatingToolbar.Button
            onClick={() => Marks.toggle(editor, { type: 'italic' })}
            active={Marks.isActive(editor, { type: 'italic' })}
            title="Italic"
          >
            I
          </FloatingToolbar.Button>
          <FloatingToolbar.Button
            onClick={() => Marks.toggle(editor, { type: 'underline' })}
            active={Marks.isActive(editor, { type: 'underline' })}
            title="Underline"
          >
            U
          </FloatingToolbar.Button>
        </FloatingToolbar.Group>
      </FloatingToolbar.Content>
    </FloatingToolbar>
  );
}

function EditorBlockActions() {
  const editor = useYooptaEditor();
  const dragHandleRef = useRef<HTMLButtonElement>(null);

  return (
    <FloatingBlockActions>
      {({ blockId }: { blockId?: string | null }) => (
        <>
          <FloatingBlockActions.Button
            onClick={() => {
              if (!blockId) {
                return;
              }

              const block = Blocks.getBlock(editor, { id: blockId });
              if (block) {
                editor.insertBlock('Paragraph', {
                  at: block.meta.order + 1,
                  focus: true,
                });
              }
            }}
          >
            +
          </FloatingBlockActions.Button>
          <FloatingBlockActions.Button ref={dragHandleRef}>
            ::
          </FloatingBlockActions.Button>
          <BlockOptions
            open={false}
            onOpenChange={() => undefined}
            anchor={dragHandleRef.current}
          >
            <BlockOptions.Content />
          </BlockOptions>
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
}: {
  documentId: string;
  currentUser: { id: string; name: string; color: string; avatar?: string };
  websocketUrl: string | null;
  savedContent: YooptaContentValue;
  readOnly: boolean;
  onChange?: (value: YooptaContentValue) => Promise<void> | void;
}) {
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRealtimeEnabled = Boolean(websocketUrl);

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
  }, [
    currentUser,
    documentId,
    isRealtimeEnabled,
    readOnly,
    savedContent,
    websocketUrl,
  ]);

  useEffect(() => {
    const collaborativeEditor = editor as {
      collaboration?: {
        connect: () => void;
        destroy: () => void;
      };
    };
    const collaboration = collaborativeEditor.collaboration;

    if (!collaboration || !isRealtimeEnabled) {
      return undefined;
    }

    collaboration.connect();

    return () => {
      collaboration.destroy();
    };
  }, [editor, isRealtimeEnabled]);

  useEffect(
    () => () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    },
    [],
  );

  const handleChange = readOnly
    ? undefined
    : (value: YooptaContentValue) => {
        if (!onChange) {
          return;
        }

        if (saveTimerRef.current) {
          clearTimeout(saveTimerRef.current);
        }

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
      {!readOnly ? <EditorToolbar /> : null}
      {!readOnly ? <EditorBlockActions /> : null}
      {!readOnly ? <SlashCommandMenu /> : null}
      {isRealtimeEnabled ? <RemoteCursors /> : null}
    </YooptaEditor>
  );
}
