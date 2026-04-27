import {
  createYooptaEditor,
  type YooptaContentValue,
  type YooptaPlugin,
  type SlateElement,
} from '@yoopta/editor';
import { withEmoji } from '@yoopta/emoji';
import { withMentions } from '@yoopta/mention';
import { applyTheme } from '@yoopta/themes-shadcn';
import { MARKS } from './marks';
import { PLUGINS } from './plugins';
import { withCommentPreservation } from './comments/withCommentPreservation';

type BaseEditorOptions = {
  readOnly?: boolean;
  value?: YooptaContentValue;
};

export function createBaseEditor({
  readOnly = false,
  value,
}: BaseEditorOptions = {}) {
  const yooEditor = withEmoji(
    withMentions(
      createYooptaEditor({
        plugins: applyTheme(PLUGINS) as unknown as YooptaPlugin<Record<string, SlateElement>, unknown>[],
        marks: MARKS,
        readOnly,
        value,
      }),
    ),
  );

  // Apply ghost-text preservation to every per-block Slate editor that
  // already exists (populated when `value` is provided at init time).
  for (const blockId of Object.keys(yooEditor.blockEditorsMap)) {
    yooEditor.blockEditorsMap[blockId] = withCommentPreservation(
      yooEditor.blockEditorsMap[blockId],
    );
  }

  // Also wrap any block editors created in the future (e.g. when a new block
  // is inserted) so preservation applies to them too.
  const originalBuild = yooEditor.buildSlateEditorFn;
  yooEditor.buildSlateEditorFn = (blockId: string) => {
    const slateEditor = originalBuild ? originalBuild(blockId) : yooEditor.blockEditorsMap[blockId];
    return withCommentPreservation(slateEditor);
  };

  return yooEditor;
}
