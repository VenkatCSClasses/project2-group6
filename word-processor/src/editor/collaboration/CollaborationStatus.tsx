import type { AccessLevel, SessionMode } from './types';

export function CollaborationStatus({
  accessLevel,
  sessionMode,
  ownerName,
  viewerName,
  websocketUrl,
  isRealtimeEnabled,
  updatedAt,
}: {
  accessLevel: AccessLevel;
  sessionMode: SessionMode;
  ownerName: string;
  viewerName: string | null;
  websocketUrl: string | null;
  isRealtimeEnabled: boolean;
  updatedAt: string;
}) {
  return (
    <section className="status-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Collaboration Setup</p>
          <h3>Workspace status</h3>
        </div>
        <span className={`mode-pill ${isRealtimeEnabled ? 'is-live' : 'is-local'}`}>
          {isRealtimeEnabled ? 'Realtime ready' : 'Local mode'}
        </span>
      </div>

      <dl className="status-grid">
        <div>
          <dt>Access</dt>
          <dd>{accessLevel === 'owner' ? 'File owner' : 'Viewer'}</dd>
        </div>
        <div>
          <dt>Current mode</dt>
          <dd>{sessionMode === 'edit' ? 'Editing' : 'Read only'}</dd>
        </div>
        <div>
          <dt>File owner</dt>
          <dd>{ownerName}</dd>
        </div>
        <div>
          <dt>Transport</dt>
          <dd>{isRealtimeEnabled ? websocketUrl : 'HTTP sync with single-viewer locking'}</dd>
        </div>
        <div>
          <dt>Active viewer</dt>
          <dd>{viewerName ?? 'No viewer connected'}</dd>
        </div>
        <div>
          <dt>Last saved</dt>
          <dd>{new Date(updatedAt).toLocaleString()}</dd>
        </div>
      </dl>
    </section>
  );
}
