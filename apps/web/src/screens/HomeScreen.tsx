import type { ActivityRecord } from '@beacon/shared';
import { Activity, ChevronRight, CirclePlus, Link2, Target } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../api';
import { capitalize, relativeTime } from '../presentation';
import { Link } from '../router';

export function HomePage() {
  const [activity, setActivity] = useState<ActivityRecord[]>([]);

  useEffect(() => {
    api<ActivityRecord[]>('/api/v1/activity')
      .then(setActivity)
      .catch(() => setActivity([]));
  }, []);

  return (
    <main className="home-shell">
      <RecentAssets activity={activity} />
    </main>
  );
}

function RecentAssets({ activity }: { activity: ActivityRecord[] }) {
  const assets = mostRecentAssets(activity);
  return (
    <section className="home-content">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Continue working</p>
          <h2>Recently worked on</h2>
        </div>
        <Link className="primary-button compact-button" to="/redirects/new">
          <CirclePlus /> Add redirect
        </Link>
      </div>
      <div className="activity-list">
        {assets.length ? (
          assets.map((item) => (
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
                  <span className="activity-type">{capitalize(item.resourceType)}</span> · Last{' '}
                  {item.action} by {item.actor}
                </small>
              </span>
              <time>{relativeTime(item.occurredAt)}</time>
              <ChevronRight />
            </Link>
          ))
        ) : (
          <div className="empty-state">
            <Activity />
            <h3>Your recently worked-on assets will appear here</h3>
            <p>Add a redirect to begin building your workspace.</p>
          </div>
        )}
      </div>
    </section>
  );
}

function mostRecentAssets(activity: ActivityRecord[]) {
  const assets = new Map<string, ActivityRecord>();
  for (const item of activity) {
    const key = `${item.resourceType}:${item.resourceId}`;
    if (!assets.has(key)) assets.set(key, item);
  }
  return [...assets.values()];
}
