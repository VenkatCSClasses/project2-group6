import {
  createYooptaEditor,
  type YooptaContentValue,
} from '@yoopta/editor';
import { MARKS } from './marks';
import { PLUGINS } from './plugins';

type BaseEditorOptions = {
  readOnly?: boolean;
  value?: YooptaContentValue;
};

export function createBaseEditor({
  readOnly = false,
  value,
}: BaseEditorOptions = {}) {
  return createYooptaEditor({
    plugins: PLUGINS,
    marks: MARKS,
    readOnly,
    value,
  });
}
