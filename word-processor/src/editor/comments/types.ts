// components/CollabStatus.tsx
import { useCollaboration, useRemoteCursors } from '@yoopta/collaboration';

export function CollabStatus() {
  const { status, connectedUsers, isSynced } = useCollaboration();
  const cursors = useRemoteCursors();

  return (
    <aside>
      <div>Status: {status}</div>
      <div>Online: {connectedUsers.length}</div>
      <div>{isSynced ? 'Synced' : 'Syncing...'}</div>
      <div>
        {cursors.map((c) => (
          <div key={c.clientId}>
            {c.user.name} editing {c.blockId}
          </div>
        ))}
      </div>
    </aside>
  );
}