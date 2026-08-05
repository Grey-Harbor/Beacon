import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import Database from 'better-sqlite3';
import type {
  ActivityRecord,
  CompactorEvent,
  DestinationResource,
  EventRecord,
  RedirectResource,
  ReportRow,
  SearchResult,
} from '@beacon/shared';

export class ProjectionStore {
  private readonly db: Database.Database;

  constructor(path: string) {
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
    this.db = new Database(path);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this.migrate();
  }

  private migrate() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS projection_meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS resources (
        id TEXT PRIMARY KEY,
        kind TEXT NOT NULL CHECK(kind IN ('redirect', 'destination')),
        title TEXT NOT NULL,
        slug TEXT NOT NULL DEFAULT '',
        source_url TEXT NOT NULL DEFAULT '',
        destination_url TEXT NOT NULL DEFAULT '',
        updated_at TEXT NOT NULL
      );
      CREATE VIRTUAL TABLE IF NOT EXISTS resource_search USING fts5(
        id UNINDEXED, kind UNINDEXED, title, slug, source_url, destination_url,
        tokenize='unicode61 remove_diacritics 2'
      );
      CREATE TABLE IF NOT EXISTS resolutions (
        canonical_url TEXT PRIMARY KEY,
        redirect_id TEXT NOT NULL UNIQUE
      );
      CREATE TABLE IF NOT EXISTS activities (
        id TEXT PRIMARY KEY,
        action TEXT NOT NULL,
        resource_type TEXT NOT NULL,
        resource_id TEXT NOT NULL,
        resource_title TEXT NOT NULL,
        actor TEXT NOT NULL,
        occurred_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_activities_occurred_at ON activities(occurred_at DESC);
      CREATE TABLE IF NOT EXISTS events (
        event_id TEXT PRIMARY KEY,
        redirect_id TEXT,
        occurred_at TEXT NOT NULL,
        outcome TEXT NOT NULL,
        payload TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_events_occurred_at ON events(occurred_at DESC);
      CREATE INDEX IF NOT EXISTS idx_events_redirect_time ON events(redirect_id, occurred_at DESC);
      CREATE INDEX IF NOT EXISTS idx_events_outcome_time ON events(outcome, occurred_at DESC);
    `);
    this.db.pragma('optimize');
    if (!this.db.prepare("SELECT 1 FROM projection_meta WHERE key='status'").get()) {
      this.setStatus('stale');
    }
  }

  close() {
    this.db.close();
  }

  status() {
    const rows = this.db.prepare('SELECT key, value FROM projection_meta').all() as Array<{
      key: string;
      value: string;
    }>;
    return Object.fromEntries(rows.map((row) => [row.key, row.value]));
  }

  setStatus(status: 'fresh' | 'stale' | 'rebuilding', rebuiltAt?: string) {
    const write = this.db.prepare(
      'INSERT INTO projection_meta(key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',
    );
    write.run('status', status);
    if (rebuiltAt) write.run('rebuiltAt', rebuiltAt);
  }

  upsertRedirect(resource: RedirectResource) {
    this.db.transaction(() => {
      this.deleteResource(resource.id);
      this.db
        .prepare(
          `INSERT INTO resources(id,kind,title,slug,source_url,destination_url,updated_at)
           VALUES (?,?,?,?,?,?,?)`,
        )
        .run(
          resource.id,
          'redirect',
          resource.title,
          resource.slug,
          resource.sourceUrl,
          resource.destination.url,
          resource.updatedAt,
        );
      this.db
        .prepare(
          `INSERT INTO resource_search(id,kind,title,slug,source_url,destination_url)
           VALUES (?,?,?,?,?,?)`,
        )
        .run(
          resource.id,
          'redirect',
          resource.title,
          resource.slug,
          resource.sourceUrl,
          resource.destination.url,
        );
      if (resource.status === 'active') {
        this.db
          .prepare(
            `INSERT INTO resolutions(canonical_url,redirect_id) VALUES (?,?)
             ON CONFLICT(canonical_url) DO UPDATE SET redirect_id=excluded.redirect_id`,
          )
          .run(resource.sourceUrl, resource.id);
      }
    })();
  }

  upsertDestination(resource: DestinationResource) {
    this.db.transaction(() => {
      this.deleteResource(resource.id);
      this.db
        .prepare(
          `INSERT INTO resources(id,kind,title,destination_url,updated_at) VALUES (?,?,?,?,?)`,
        )
        .run(resource.id, 'destination', resource.title, resource.url, resource.updatedAt);
      this.db
        .prepare(
          `INSERT INTO resource_search(id,kind,title,slug,source_url,destination_url)
           VALUES (?,?,?,?,?,?)`,
        )
        .run(resource.id, 'destination', resource.title, '', '', resource.url);
    })();
  }

  deleteResource(id: string) {
    this.db.prepare('DELETE FROM resources WHERE id=?').run(id);
    this.db.prepare('DELETE FROM resource_search WHERE id=?').run(id);
    this.db.prepare('DELETE FROM resolutions WHERE redirect_id=?').run(id);
  }

  findResolution(canonicalUrl: string): string | null {
    const row = this.db
      .prepare('SELECT redirect_id FROM resolutions WHERE canonical_url=?')
      .get(canonicalUrl) as { redirect_id: string } | undefined;
    return row?.redirect_id ?? null;
  }

  search(query: string, limit = 8): SearchResult[] {
    const trimmed = query.trim();
    if (!trimmed) return [];
    const tokens = trimmed
      .split(/\s+/)
      .map((token) => token.replace(/[^\p{L}\p{N}_-]/gu, ''))
      .filter(Boolean);
    if (!tokens.length) return [];
    const match = tokens.map((token) => `"${token}"*`).join(' AND ');
    const rows = this.db
      .prepare(
        `SELECT id,kind,title,
          CASE WHEN kind='redirect' THEN source_url ELSE destination_url END AS subtitle
         FROM resource_search WHERE resource_search MATCH ? ORDER BY rank LIMIT ?`,
      )
      .all(match, Math.min(limit, 20)) as SearchResult[];
    return rows;
  }

  addActivity(activity: ActivityRecord) {
    this.db
      .prepare(
        `INSERT OR IGNORE INTO activities
         (id,action,resource_type,resource_id,resource_title,actor,occurred_at)
         VALUES (@id,@action,@resourceType,@resourceId,@resourceTitle,@actor,@occurredAt)`,
      )
      .run(activity);
  }

  recentActivity(limit = 10): ActivityRecord[] {
    return this.db
      .prepare(
        `SELECT id,action,resource_type AS resourceType,resource_id AS resourceId,
          resource_title AS resourceTitle,actor,occurred_at AS occurredAt
         FROM activities ORDER BY occurred_at DESC LIMIT ?`,
      )
      .all(Math.min(limit, 100)) as ActivityRecord[];
  }

  addEvent(event: CompactorEvent) {
    this.db
      .prepare(
        `INSERT OR IGNORE INTO events(event_id,redirect_id,occurred_at,outcome,payload)
         VALUES (?,?,?,?,?)`,
      )
      .run(
        event.event_id,
        event.redirect_id,
        event.occurred_at,
        event.outcome,
        JSON.stringify(event),
      );
  }

  hasEvent(eventId: string) {
    return Boolean(this.db.prepare('SELECT 1 FROM events WHERE event_id=?').get(eventId));
  }

  events(options: {
    redirectId?: string | undefined;
    outcome?: string | undefined;
    since?: string | undefined;
    limit?: number | undefined;
  }) {
    const conditions: string[] = [];
    const values: unknown[] = [];
    if (options.redirectId) {
      conditions.push('redirect_id=?');
      values.push(options.redirectId);
    }
    if (options.outcome) {
      conditions.push('outcome=?');
      values.push(options.outcome);
    }
    if (options.since) {
      conditions.push('occurred_at>=?');
      values.push(options.since);
    }
    values.push(Math.min(options.limit ?? 100, 500));
    const rows = this.db
      .prepare(
        `SELECT payload FROM events ${conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''}
         ORDER BY occurred_at DESC LIMIT ?`,
      )
      .all(...values) as Array<{ payload: string }>;
    return rows.map((row) => JSON.parse(row.payload) as EventRecord);
  }

  report(since?: string): ReportRow[] {
    const rows = this.db
      .prepare(
        `SELECT redirect_id AS redirectId,
          SUM(outcome='redirected') AS redirected,
          SUM(outcome='not_found') AS notFound,
          SUM(outcome='invalid_request') AS invalidRequest,
          SUM(outcome='source_error') AS sourceError,
          COUNT(*) AS total
         FROM events ${since ? 'WHERE occurred_at>=?' : ''}
         GROUP BY redirect_id ORDER BY total DESC`,
      )
      .all(...(since ? [since] : [])) as ReportRow[];
    return rows;
  }

  replaceAll(input: {
    redirects: RedirectResource[];
    destinations: DestinationResource[];
    activities: ActivityRecord[];
    events: CompactorEvent[];
  }) {
    this.setStatus('rebuilding');
    this.db.transaction(() => {
      this.db.exec(
        'DELETE FROM resource_search; DELETE FROM resources; DELETE FROM resolutions; DELETE FROM activities; DELETE FROM events;',
      );
      for (const destination of input.destinations) this.upsertDestination(destination);
      for (const redirect of input.redirects) this.upsertRedirect(redirect);
      for (const activity of input.activities) this.addActivity(activity);
      for (const event of input.events) this.addEvent(event);
      this.setStatus('fresh', new Date().toISOString());
    })();
  }
}
