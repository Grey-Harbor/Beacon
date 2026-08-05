import type { ActivityRecord, SearchResult } from '@beacon/shared';
import {
  Activity,
  BarChart3,
  ChevronRight,
  CirclePlus,
  FilePenLine,
  Link2,
  LogOut,
  Menu,
  Search,
  Settings,
  Target,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { api, json } from '../api';
import { capitalize, relativeTime } from '../presentation';
import { Link, useNavigate } from '../router';
import type { Session } from '../types';

interface HomePageProps {
  session: Session;
  onLogout(): Promise<void>;
}

export function HomePage({ session, onLogout }: HomePageProps) {
  const navigate = useNavigate();
  const searchInput = useRef<HTMLInputElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [activity, setActivity] = useState<ActivityRecord[]>([]);

  useEffect(() => {
    api<ActivityRecord[]>('/api/v1/activity')
      .then(setActivity)
      .catch(() => setActivity([]));
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      if (!query.trim()) {
        setResults([]);
        return;
      }
      api<SearchResult[]>(`/api/v1/search?q=${encodeURIComponent(query)}`, {
        signal: controller.signal,
      })
        .then(setResults)
        .catch(() => setResults([]));
    }, 120);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query]);

  function openResult(result: SearchResult) {
    navigate(`/${result.kind}s/${result.id}/edit`);
  }

  async function logout() {
    await api('/api/v1/session', json('DELETE'));
    await onLogout();
  }

  return (
    <main className="home-shell">
      <header className="home-header">
        <div className="brand-lockup">
          <span className="brand-mark small">B</span>
          <span>Beacon</span>
        </div>
        <span className="user-chip">{session.user?.username}</span>
      </header>

      <section className="search-workspace">
        <div className="search-row">
          <button
            className="icon-button menu-trigger"
            aria-label="Open application menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <Menu />
          </button>
          <Search className="search-icon" aria-hidden="true" />
          <input
            ref={searchInput}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === '/') {
                event.preventDefault();
                setMenuOpen(true);
              }
              if (event.key === 'Enter' && results[0]) openResult(results[0]);
            }}
            placeholder="Find a redirect or destination…"
            aria-label="Search Beacon"
            autoFocus
          />
          {query && (
            <button
              className="icon-button"
              aria-label="Clear search"
              onClick={() => {
                setQuery('');
                searchInput.current?.focus();
              }}
            >
              <X />
            </button>
          )}
          {menuOpen && <ApplicationMenu close={() => setMenuOpen(false)} logout={logout} />}
        </div>
        <SearchContent query={query} results={results} openResult={openResult} />
      </section>

      <RecentActivity activity={activity} />
    </main>
  );
}

function SearchContent({
  query,
  results,
  openResult,
}: {
  query: string;
  results: SearchResult[];
  openResult(result: SearchResult): void;
}) {
  if (!query) {
    return (
      <div className="search-hint">
        <span>Search is navigation</span>
        <kbd>/</kbd>
        <span>opens the menu</span>
      </div>
    );
  }

  return (
    <div className="search-results" aria-live="polite">
      {results.length ? (
        results.map((result) => (
          <button key={result.id} className="result-row" onClick={() => openResult(result)}>
            <span className={`result-icon ${result.kind}`}>
              {result.kind === 'redirect' ? <Link2 /> : <Target />}
            </span>
            <span>
              <strong>{result.title}</strong>
              <small>{result.subtitle}</small>
            </span>
            <ChevronRight />
          </button>
        ))
      ) : (
        <div className="empty-state compact">
          <Search />
          <p>No matching assets</p>
        </div>
      )}
    </div>
  );
}

function RecentActivity({ activity }: { activity: ActivityRecord[] }) {
  return (
    <section className="home-content">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Continue working</p>
          <h2>Recent activity</h2>
        </div>
        <Link className="primary-button compact-button" to="/redirects/new">
          <CirclePlus /> Add redirect
        </Link>
      </div>
      <div className="activity-list">
        {activity.length ? (
          activity.map((item) => (
            <Link
              key={item.id}
              className="activity-row"
              to={`/${item.resourceType}s/${item.resourceId}/edit`}
            >
              <span className="activity-dot">
                <FilePenLine />
              </span>
              <span>
                <strong>{item.resourceTitle}</strong>
                <small>
                  {capitalize(item.action)} by {item.actor}
                </small>
              </span>
              <time>{relativeTime(item.occurredAt)}</time>
              <ChevronRight />
            </Link>
          ))
        ) : (
          <div className="empty-state">
            <Activity />
            <h3>Your edits will appear here</h3>
            <p>Add a redirect to begin building your workspace.</p>
          </div>
        )}
      </div>
    </section>
  );
}

function ApplicationMenu({ close, logout }: { close(): void; logout(): void }) {
  return (
    <div className="app-menu" role="menu">
      <p className="menu-label">Create</p>
      <Link role="menuitem" to="/redirects/new" onClick={close}>
        <CirclePlus /> Add redirect <span>⌘ N</span>
      </Link>
      <Link role="menuitem" to="/destinations/new" onClick={close}>
        <Target /> Add destination
      </Link>
      <div className="menu-divider" />
      <Link role="menuitem" to="/reports" onClick={close}>
        <BarChart3 /> Reporting
      </Link>
      <Link role="menuitem" to="/settings" onClick={close}>
        <Settings /> Settings
      </Link>
      <div className="menu-divider" />
      <button role="menuitem" onClick={logout}>
        <LogOut /> Sign out
      </button>
    </div>
  );
}
