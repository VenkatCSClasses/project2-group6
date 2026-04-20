import type { ActiveSession, PresenceSnapshot } from './types';

export function RemotePresence({
  session,
  presence,
}: {
  session: ActiveSession;
  presence: PresenceSnapshot;
}) {
  return (
    <section className="presence-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Roles</p>
          <h3>Workspace roster</h3>
        </div>
      </div>

      <div className="presence-list">
        <article
          className={`presence-card ${session.accessLevel === 'owner' ? 'is-active' : ''}`}
        >
          <span className="presence-dot" style={{ backgroundColor: '#0f766e' }} />
          <div>
            <strong>{presence.ownerName}</strong>
            <p>
              File owner
              {presence.ownerConnected ? ' · connected' : ' · offline'}
              {session.accessLevel === 'owner' ? ' · current session' : ''}
            </p>
          </div>
        </article>
        <article
          className={`presence-card ${session.accessLevel === 'viewer' ? 'is-active' : ''}`}
        >
          <span className="presence-dot" style={{ backgroundColor: '#2563eb' }} />
          <div>
            <strong>{presence.viewerName ?? 'Viewer slot open'}</strong>
            <p>
              {presence.viewerConnected ? 'Viewer connected' : 'No viewer connected'}
              {session.accessLevel === 'viewer' ? ' · current session' : ''}
            </p>
          </div>
        </article>
      </div>
    </section>
  );
}
