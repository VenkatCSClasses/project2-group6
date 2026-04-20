import type { YooptaContentValue } from '@yoopta/editor';
import type { PresenceSnapshot } from '../collaboration/types';

export type EditorDocument = {
  id: string;
  title: string;
  ownerId: string;
  ownerName: string;
  content: YooptaContentValue;
  updatedAt: string;
  presence: PresenceSnapshot;
};

export type SaveDocumentInput = {
  documentId: string;
  content: YooptaContentValue;
  sessionId: string;
};
