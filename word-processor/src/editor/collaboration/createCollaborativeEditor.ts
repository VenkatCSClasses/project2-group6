// collaboration/createCollaborativeEditor.ts
import { createYooptaEditor } from '@yoopta/editor';
import { withCollaboration } from '@yoopta/collaboration';
import { PLUGINS } from '../editor/plugins';
import { MARKS } from '../editor/marks';

export function createCollaborativeEditor({
  roomId,
  user,
  savedContent,
}: {
  roomId: string;
  user: { id: string; name: string; color: string; avatar?: string };
  savedContent?: any;
}) {
  return withCollaboration(
    createYooptaEditor({ plugins: PLUGINS, marks: MARKS }),
    {
      url: 'ws://localhost:4000',
      roomId,
      user,
      initialValue: savedContent,
    }
  );
}