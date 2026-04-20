import { type YooptaContentValue } from '@yoopta/editor';
import { withCollaboration } from '@yoopta/collaboration';
import { createBaseEditor } from '../createBaseEditor';

export function createCollaborativeEditor({
  roomId,
  user,
  websocketUrl,
  savedContent,
  readOnly = false,
}: {
  roomId: string;
  user: { id: string; name: string; color: string; avatar?: string };
  websocketUrl: string;
  savedContent?: YooptaContentValue;
  readOnly?: boolean;
}) {
  return withCollaboration(
    createBaseEditor({ value: savedContent, readOnly }),
    {
      url: websocketUrl,
      roomId,
      user,
      initialValue: savedContent,
      connect: false,
    },
  );
}
