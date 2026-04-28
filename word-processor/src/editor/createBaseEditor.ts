import {
  createYooptaEditor,
  type YooptaContentValue,
} from '@yoopta/editor';
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
  const yooEditor = createYooptaEditor({
    plugins: PLUGINS,
    marks: MARKS,
    readOnly,
    value,
  });

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
