import { useEffect, useState } from 'react';
import { api, json } from '../api';
import { PageHeader } from '../components';
import { errorMessage, relativeTime } from '../presentation';

interface RebuildResult {
  redirects: number;
  destinations: number;
  events: number;
}

export function SettingsPage() {
  const [status, setStatus] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState('');

  async function refresh() {
    setStatus(await api<Record<string, string>>('/api/v1/projections'));
  }

  useEffect(() => void refresh(), []);

  async function rebuild() {
    setNotice('Rebuilding from Drift…');
    try {
      const result = await api<RebuildResult>('/api/v1/projections/rebuild', json('POST'));
      setNotice(rebuildSummary(result));
      await refresh();
    } catch (reason) {
      setNotice(errorMessage(reason));
    }
  }

  return (
    <main className="workspace-page narrow-workspace">
      <PageHeader label="Settings" title="System health" />
      <section className="narrow-editor">
        <div className="settings-row">
          <span className={`health-indicator ${status.status === 'fresh' ? 'fresh' : ''}`} />
          <div>
            <h3>Local projections</h3>
            <p>
              {status.status === 'fresh'
                ? 'Search, resolution, and reporting indexes are current.'
                : 'The local read model needs attention.'}
            </p>
            {status.rebuiltAt && <small>Last rebuilt {relativeTime(status.rebuiltAt)}</small>}
          </div>
          <button className="secondary-button" onClick={rebuild}>
            Rebuild
          </button>
        </div>
        <div className="settings-row">
          <span className="health-indicator fresh" />
          <div>
            <h3>Runtime contract</h3>
            <p>Compactor changes propagate within 30 seconds under normal operation.</p>
            <small>Source and event credentials are configured outside the application.</small>
          </div>
        </div>
        {notice && <p className="calm-note">{notice}</p>}
      </section>
    </main>
  );
}

function rebuildSummary(result: RebuildResult) {
  return `Rebuilt ${result.redirects} redirects, ${result.destinations} destinations, and ${result.events} events.`;
}
