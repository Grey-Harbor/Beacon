import type { EventRecord, ReportRow } from '@beacon/shared';
import { ExternalLink } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../api';
import { PageHeader } from '../components';
import { relativeTime } from '../presentation';

export function ReportsPage() {
  const [period, setPeriod] = useState('30');
  const [outcome, setOutcome] = useState('all');
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [events, setEvents] = useState<EventRecord[]>([]);

  useEffect(() => {
    const since = periodStart(period);
    Promise.all([loadReport(since), loadEvents(since, outcome)]).then(([report, history]) => {
      setRows(report);
      setEvents(history);
    });
  }, [period, outcome]);

  return (
    <main className="workspace-page report-workspace">
      <PageHeader label="Reporting" title="Redirect activity" />
      <section className="report-page">
        <div className="section-heading">
          <div>
            <h2>Observed requests</h2>
            <p>
              Compactor event delivery is best-effort; use this report for operations, not billing.
            </p>
          </div>
          <ReportFilters
            period={period}
            outcome={outcome}
            onPeriod={setPeriod}
            onOutcome={setOutcome}
          />
        </div>
        <ReportTable rows={rows} />
        <div className="section-heading secondary">
          <div>
            <h2>Event history</h2>
            <p>The latest sanitized observations received from Compactor.</p>
          </div>
        </div>
        <EventHistory events={events} />
      </section>
    </main>
  );
}

function ReportFilters({
  period,
  outcome,
  onPeriod,
  onOutcome,
}: {
  period: string;
  outcome: string;
  onPeriod(value: string): void;
  onOutcome(value: string): void;
}) {
  return (
    <div className="report-filters">
      <label className="inline-select">
        Period
        <select value={period} onChange={(event) => onPeriod(event.target.value)}>
          <option value="7">7 days</option>
          <option value="30">30 days</option>
          <option value="90">90 days</option>
          <option value="all">All time</option>
        </select>
      </label>
      <label className="inline-select">
        Events
        <select value={outcome} onChange={(event) => onOutcome(event.target.value)}>
          <option value="all">All outcomes</option>
          <option value="redirected">Redirected</option>
          <option value="not_found">Not found</option>
          <option value="invalid_request">Invalid request</option>
          <option value="source_error">Source error</option>
        </select>
      </label>
    </div>
  );
}

function ReportTable({ rows }: { rows: ReportRow[] }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Redirect ID</th>
            <th>Redirected</th>
            <th>Not found</th>
            <th>Invalid</th>
            <th>Source error</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.redirectId ?? 'unresolved'}>
              <td>{row.redirectId ?? 'Unresolved requests'}</td>
              <td>{row.redirected}</td>
              <td>{row.notFound}</td>
              <td>{row.invalidRequest}</td>
              <td>{row.sourceError}</td>
              <td>
                <strong>{row.total}</strong>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EventHistory({ events }: { events: EventRecord[] }) {
  return (
    <div className="event-list">
      {events.map((event) => (
        <div className="event-row" key={event.event_id}>
          <span className={`outcome-dot ${event.outcome}`} />
          <span>
            <strong>
              {event.request.host}
              {event.request.path}
            </strong>
            <small>
              {event.outcome.replaceAll('_', ' ')} · {event.response.status_code}
            </small>
          </span>
          <time>{relativeTime(event.occurred_at)}</time>
          {event.response.location && (
            <a
              href={event.response.location}
              target="_blank"
              rel="noreferrer"
              aria-label="Open destination"
            >
              <ExternalLink />
            </a>
          )}
        </div>
      ))}
    </div>
  );
}

function periodStart(period: string) {
  return period === 'all' ? '' : new Date(Date.now() - Number(period) * 86_400_000).toISOString();
}

function loadReport(since: string) {
  const suffix = since ? `?since=${encodeURIComponent(since)}` : '';
  return api<ReportRow[]>(`/api/v1/reports/redirects${suffix}`);
}

function loadEvents(since: string, outcome: string) {
  const query = new URLSearchParams();
  if (since) query.set('since', since);
  if (outcome !== 'all') query.set('outcome', outcome);
  return api<EventRecord[]>(`/api/v1/events${query.size ? `?${query}` : ''}`);
}
