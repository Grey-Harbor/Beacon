import type { ActivityRecord } from '@beacon/shared';
import { Activity, ChevronRight, Link2, Target } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../api';
import { ErrorMessage, PageHeader } from '../components';
import { capitalize, errorMessage, relativeTime } from '../presentation';
import { Link } from '../router';

export function ActivityPage() {
  const [activity, setActivity] = useState<ActivityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api<ActivityRecord[]>('/api/v1/activity')
      .then(setActivity)
      .catch((reason) => setError(errorMessage(reason)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="workspace-page report-workspace">
      <PageHeader label="Audit log" title="Recent activity" />
      <section className="report-page">
        <div className="section-heading">
          <div>
            <h2>Latest management changes</h2>
            <p>Each entry records a create, edit, disable, or archive action.</p>
          </div>
        </div>
        {error && <ErrorMessage>{error}</ErrorMessage>}
        {loading ? (
          <p className="muted">Loading activity…</p>
        ) : (
          <ActivityHistory activity={activity} />
        )}
      </section>
    </main>
  );
}

function ActivityHistory({ activity }: { activity: ActivityRecord[] }) {
  if (!activity.length) {
    return (
      <div className="empty-state">
        <Activity />
        <h3>No activity yet</h3>
        <p>Create or update a redirect or destination to begin the audit trail.</p>
      </div>
    );
  }

  return (
    <div className="activity-list">
      {activity.map((item) => (
        <Link
          key={item.id}
          className="activity-row"
          to={`/${item.resourceType}s/${item.resourceId}/edit`}
        >
          <span className={`activity-dot ${item.resourceType}`} aria-hidden="true">
            {item.resourceType === 'redirect' ? <Link2 /> : <Target />}
          </span>
          <span>
            <strong>{item.resourceTitle}</strong>
            <small>
              <span className="activity-type">{capitalize(item.resourceType)}</span> ·{' '}
              {capitalize(item.action)} by {item.actor}
            </small>
          </span>
          <time>{relativeTime(item.occurredAt)}</time>
          <ChevronRight />
        </Link>
      ))}
    </div>
  );
}
