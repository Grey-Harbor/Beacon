import type { DestinationResource, EventRecord, RedirectResource, ReportRow } from '@beacon/shared';
import { Archive, ChevronRight, QrCode } from 'lucide-react';
import QRCode from 'qrcode';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { api, json } from '../api';
import { ErrorMessage, Field, Loading, PageHeader } from '../components';
import {
  conflictMessage,
  deriveSlug,
  download,
  errorMessage,
  parseHeaders,
  relativeTime,
} from '../presentation';
import { Link, useNavigate, usePath } from '../router';

export function RedirectEditorPage() {
  const id = redirectIdFromPath(usePath());
  const navigate = useNavigate();
  const [redirect, setRedirect] = useState<RedirectResource | null>(null);
  const [destinations, setDestinations] = useState<DestinationResource[]>([]);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [report, setReport] = useState<ReportRow | null>(null);
  const [qr, setQr] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    loadEditor(id)
      .then((data) => {
        setDestinations(data.destinations);
        setRedirect(data.redirect);
        setEvents(data.events);
        setReport(data.report);
      })
      .catch((reason) => setError(errorMessage(reason)));
  }, [id]);

  useEffect(() => {
    if (!redirect?.sourceUrl) return;
    QRCode.toString(redirect.sourceUrl, {
      type: 'svg',
      margin: 1,
      color: { dark: '#24332b', light: '#ffffff' },
    }).then(setQr);
  }, [redirect?.sourceUrl]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const body = formPayload(new FormData(event.currentTarget), redirect);
      const saved = await api<RedirectResource>(
        id ? `/api/v1/redirects/${id}` : '/api/v1/redirects',
        json(id ? 'PATCH' : 'POST', body),
      );
      if (!id) navigate(`/redirects/${saved.id}/edit`, { replace: true });
      setRedirect(saved);
    } catch (reason) {
      setError(conflictMessage(reason));
    } finally {
      setBusy(false);
    }
  }

  async function archive() {
    if (!redirect || !confirm(`Archive “${redirect.title}”?`)) return;
    await api(`/api/v1/redirects/${redirect.id}`, json('DELETE', { version: redirect.version }));
    navigate('/');
  }

  const statistics = useMemo(
    () => ({ total: report?.total ?? events.length, last: events[0]?.occurred_at }),
    [events, report],
  );

  if (id && !redirect && !error) return <Loading />;

  return (
    <main className="workspace-page editor-workspace">
      <PageHeader
        label={id ? 'Redirect workspace' : 'New asset'}
        title={redirect?.title ?? 'Add redirect'}
        actions={
          redirect && (
            <button className="danger-quiet" onClick={archive}>
              <Archive /> Archive
            </button>
          )
        }
      />
      <form className="editor-layout" onSubmit={save}>
        <RedirectForm redirect={redirect} destinations={destinations} busy={busy} error={error} />
        <RedirectSidebar redirect={redirect} qr={qr} statistics={statistics} />
      </form>
    </main>
  );
}

function RedirectForm({
  redirect,
  destinations,
  busy,
  error,
}: {
  redirect: RedirectResource | null;
  destinations: DestinationResource[];
  busy: boolean;
  error: string;
}) {
  return (
    <section className="editor-main">
      <FormSection number="01" title="Identity">
        Give this redirect a clear name and a memorable key.
      </FormSection>
      <div className="field-grid two">
        <Field label="Title" name="title" defaultValue={redirect?.title} required autoFocus />
        <Field
          label="Slug"
          name="slug"
          defaultValue={redirect?.slug}
          pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
          required
        />
      </div>
      <Field
        label="Source URL"
        name="sourceUrl"
        type="url"
        defaultValue={redirect?.sourceUrl}
        onBlur={(event) => {
          const slug = event.currentTarget.form?.elements.namedItem('slug') as HTMLInputElement;
          if (slug && !slug.value) slug.value = deriveSlug(event.currentTarget.value);
        }}
        hint="Queries and fragments do not participate in matching."
        required
      />

      <FormSection number="02" title="Destination">
        Reuse an existing destination so shared URLs stay consistent.
      </FormSection>
      <DestinationFields redirect={redirect} destinations={destinations} />
      <AdvancedFields redirect={redirect} />

      {error && <ErrorMessage>{error}</ErrorMessage>}
      <div className="form-actions">
        <Link className="text-button" to="/">
          Cancel
        </Link>
        <button className="primary-button" disabled={busy}>
          {busy ? 'Saving…' : redirect ? 'Save changes' : 'Add redirect'}
        </button>
      </div>
    </section>
  );
}

function FormSection({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: string;
}) {
  return (
    <div className="form-section">
      <p className="section-number">{number}</p>
      <div>
        <h2>{title}</h2>
        <p>{children}</p>
      </div>
    </div>
  );
}

function DestinationFields({
  redirect,
  destinations,
}: {
  redirect: RedirectResource | null;
  destinations: DestinationResource[];
}) {
  const requiresNewDestination = !destinations.length && !redirect;
  return (
    <>
      <label className="field">
        <span>Destination</span>
        <select name="destinationId" defaultValue={redirect?.destination.id ?? ''}>
          <option value="">Create a new destination</option>
          {destinations.map((destination) => (
            <option value={destination.id} key={destination.id}>
              {destination.title} — {destination.url}
            </option>
          ))}
        </select>
      </label>
      <div className="field-grid two">
        <Field
          label="New destination title"
          name="destinationTitle"
          hint="Used only when “Create a new destination” is selected."
          required={requiresNewDestination}
        />
        <Field
          label="New destination URL"
          name="destinationUrl"
          type="url"
          required={requiresNewDestination}
        />
      </div>
    </>
  );
}

function AdvancedFields({ redirect }: { redirect: RedirectResource | null }) {
  const headers = redirect
    ? Object.entries(redirect.responseHeaders)
        .map(([key, value]) => `${key}: ${value}`)
        .join('\n')
    : 'Cache-Control: public, max-age=300';

  return (
    <details className="advanced">
      <summary>
        Advanced behavior <ChevronRight />
      </summary>
      <div className="field-grid two">
        <label className="field">
          <span>Status</span>
          <select name="status" defaultValue={redirect?.status ?? 'active'}>
            <option value="active">Active</option>
            <option value="disabled">Disabled</option>
          </select>
        </label>
        <label className="field">
          <span>HTTP status</span>
          <select name="statusCode" defaultValue={redirect?.statusCode ?? 308}>
            {[301, 302, 303, 307, 308].map((code) => (
              <option key={code}>{code}</option>
            ))}
          </select>
        </label>
      </div>
      <label className="field">
        <span>Response headers</span>
        <textarea name="responseHeaders" rows={4} defaultValue={headers} />
        <small>One “Name: value” header per line.</small>
      </label>
    </details>
  );
}

function RedirectSidebar({
  redirect,
  qr,
  statistics,
}: {
  redirect: RedirectResource | null;
  qr: string;
  statistics: { total: number; last: string | undefined };
}) {
  return (
    <aside className="editor-aside">
      <div className="aside-block">
        <p className="eyebrow">Publishing</p>
        <p className="calm-note">
          Changes reach Compactor within the configured 30-second cache window. Cached redirects may
          remain available during a source outage.
        </p>
      </div>
      {redirect && (
        <>
          <div className="aside-block">
            <div className="aside-title">
              <h3>Activity</h3>
              <span className={`status-pill ${redirect.status}`}>{redirect.status}</span>
            </div>
            <div className="stat-line">
              <span>Recorded events</span>
              <strong>{statistics.total}</strong>
            </div>
            <div className="stat-line">
              <span>Last request</span>
              <strong>{statistics.last ? relativeTime(statistics.last) : 'Never'}</strong>
            </div>
          </div>
          <div className="aside-block">
            <div className="aside-title">
              <h3>QR code</h3>
              <QrCode />
            </div>
            {qr && <div className="qr" dangerouslySetInnerHTML={{ __html: qr }} />}
            <button
              type="button"
              className="secondary-button full"
              onClick={() => download(`beacon-${redirect.slug}.svg`, qr, 'image/svg+xml')}
            >
              <QrCode /> Download SVG
            </button>
          </div>
        </>
      )}
    </aside>
  );
}

function redirectIdFromPath(path: string) {
  return /^\/redirects\/([^/]+)\/edit$/.exec(path)?.[1];
}

async function loadEditor(id: string | undefined) {
  const [destinations, redirect, events, report] = await Promise.all([
    api<DestinationResource[]>('/api/v1/destinations'),
    id ? api<RedirectResource>(`/api/v1/redirects/${id}`) : Promise.resolve(null),
    id
      ? api<EventRecord[]>(`/api/v1/events?redirectId=${encodeURIComponent(id)}`)
      : Promise.resolve([]),
    id
      ? api<ReportRow[]>('/api/v1/reports/redirects').then(
          (rows) => rows.find((row) => row.redirectId === id) ?? null,
        )
      : Promise.resolve(null),
  ]);
  return { destinations, redirect, events, report };
}

function formPayload(form: FormData, redirect: RedirectResource | null) {
  const data = Object.fromEntries(form);
  return {
    title: data.title,
    slug: data.slug,
    sourceUrl: data.sourceUrl,
    destinationId: data.destinationId || undefined,
    destination: data.destinationId
      ? undefined
      : { title: data.destinationTitle, url: data.destinationUrl },
    status: data.status,
    statusCode: Number(data.statusCode),
    responseHeaders: parseHeaders(String(data.responseHeaders ?? '')),
    ...(redirect ? { version: redirect.version } : {}),
  };
}
