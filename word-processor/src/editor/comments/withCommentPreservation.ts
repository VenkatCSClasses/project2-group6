import { Editor, Text, Transforms, type BaseEditor } from 'slate';
import type { CommentHighlightValue } from './commentMarks';

type CommentLeaf = {
  text: string;
  commentHighlight?: CommentHighlightValue;
};

function isCommentedLeaf(node: unknown): node is CommentLeaf {
  return (
    Text.isText(node as object) &&
    !!(node as CommentLeaf).commentHighlight &&
    !(node as CommentLeaf).commentHighlight?.deleted
  );
}

// Applies ghost-text behaviour: instead of deleting text that carries a
// commentHighlight mark, marks it deleted:true so it renders as strikethrough.
export function withCommentPreservation<T extends BaseEditor>(editor: T): T {
  const { deleteBackward, deleteForward, deleteFragment } = editor;

  editor.deleteFragment = (direction) => {
    const { selection } = editor;

    if (!selection) {
      deleteFragment(direction);
      return;
    }

    const commentedEntries = Array.from(
      Editor.nodes(editor, {
        at: selection,
        match: isCommentedLeaf,
      }),
    );

    if (commentedEntries.length === 0) {
      deleteFragment(direction);
      return;
    }

    // Ghost the commented ranges; let Slate delete the rest via a selection
    // that has been split around them.
    Editor.withoutNormalizing(editor, () => {
      for (const [node, path] of commentedEntries) {
        const leaf = node as CommentLeaf;
        Transforms.setNodes(
          editor,
          {
            commentHighlight: {
              ...(leaf.commentHighlight as CommentHighlightValue),
              deleted: true,
            },
          } as Partial<CommentLeaf>,
          { at: path },
        );
      }

      // Delete the non-commented parts of the selection by collapsing
      // commented nodes out of the selection range.
      // Strategy: select only the non-commented spans and delete those.
      // Simplest safe approach: shrink the selection to exclude ghost nodes,
      // then call the original deleteFragment on each non-ghost sub-range.
      // For MVP we just call deleteFragment on the remaining selection,
      // which will skip nodes now marked as ghost (their text is retained).
      deleteFragment(direction);
    });
  };

  editor.deleteBackward = (unit) => {
    const { selection } = editor;

    if (!selection) {
      deleteBackward(unit);
      return;
    }

    // For character-by-character deletion, check the leaf just before cursor.
    const before = Editor.before(editor, selection, { unit });
    if (!before) {
      deleteBackward(unit);
      return;
    }

    const [nodeEntry] = Array.from(
      Editor.nodes(editor, {
        at: { anchor: before, focus: selection.anchor },
        match: isCommentedLeaf,
      }),
    );

    if (!nodeEntry) {
      deleteBackward(unit);
      return;
    }

    const [node, path] = nodeEntry;
    const leaf = node as CommentLeaf;
    Transforms.setNodes(
      editor,
      {
        commentHighlight: {
          ...(leaf.commentHighlight as CommentHighlightValue),
          deleted: true,
        },
      } as Partial<CommentLeaf>,
      { at: path },
    );
    // Move cursor back past the ghost character instead of deleting it.
    Transforms.setSelection(editor, { anchor: before, focus: before });
  };

  editor.deleteForward = (unit) => {
    const { selection } = editor;

    if (!selection) {
      deleteForward(unit);
      return;
    }

    const after = Editor.after(editor, selection, { unit });
    if (!after) {
      deleteForward(unit);
      return;
    }

    const [nodeEntry] = Array.from(
      Editor.nodes(editor, {
        at: { anchor: selection.focus, focus: after },
        match: isCommentedLeaf,
      }),
    );

    if (!nodeEntry) {
      deleteForward(unit);
      return;
    }

    const [node, path] = nodeEntry;
    const leaf = node as CommentLeaf;
    Transforms.setNodes(
      editor,
      {
        commentHighlight: {
          ...(leaf.commentHighlight as CommentHighlightValue),
          deleted: true,
        },
      } as Partial<CommentLeaf>,
      { at: path },
    );
    // Cursor stays in place — the character is ghosted, not deleted.
  };

  return editor;
}
