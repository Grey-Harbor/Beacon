import type { DestinationResource } from '@beacon/shared';
import { Archive, Link2 } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { api, json } from '../api';
import { ErrorMessage, Field, Loading, PageHeader } from '../components';
import { conflictMessage, errorMessage } from '../presentation';
import { Link, useNavigate, usePath } from '../router';

export function DestinationEditorPage() {
  const id = /^\/destinations\/([^/]+)\/edit$/.exec(usePath())?.[1];
  const navigate = useNavigate();
  const [destination, setDestination] = useState<DestinationResource | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    api<DestinationResource[]>('/api/v1/destinations')
      .then((items) => setDestination(items.find((item) => item.id === id) ?? null))
      .catch((reason) => setError(errorMessage(reason)));
  }, [id]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const body = { ...values, ...(destination ? { version: destination.version } : {}) };
    try {
      const saved = await api<DestinationResource>(
        id ? `/api/v1/destinations/${id}` : '/api/v1/destinations',
        json(id ? 'PATCH' : 'POST', body),
      );
      if (!id) navigate(`/destinations/${saved.id}/edit`, { replace: true });
      setDestination(saved);
    } catch (reason) {
      setError(conflictMessage(reason));
    }
  }

  async function archive() {
    if (!destination || !confirm(`Archive “${destination.title}”?`)) return;
    try {
      await api(
        `/api/v1/destinations/${destination.id}`,
        json('DELETE', { version: destination.version }),
      );
      navigate('/');
    } catch (reason) {
      setError(errorMessage(reason));
    }
  }

  if (id && !destination && !error) return <Loading />;

  return (
    <main className="workspace-page narrow-workspace">
      <PageHeader
        label={id ? 'Destination workspace' : 'New asset'}
        title={destination?.title ?? 'Add destination'}
        actions={
          destination && (
            <button className="danger-quiet" onClick={archive}>
              <Archive /> Archive
            </button>
          )
        }
      />
      <form className="narrow-editor" onSubmit={save}>
        <div className="form-section">
          <p className="section-number">01</p>
          <div>
            <h2>Destination</h2>
            <p>Redirects that reuse this destination follow URL edits automatically.</p>
          </div>
        </div>
        <Field label="Title" name="title" defaultValue={destination?.title} required autoFocus />
        <Field
          label="Destination URL"
          name="url"
          type="url"
          defaultValue={destination?.url}
          required
        />
        {destination && <ReferenceCount destination={destination} />}
        {error && <ErrorMessage>{error}</ErrorMessage>}
        <div className="form-actions">
          <Link className="text-button" to="/">
            Cancel
          </Link>
          <button className="primary-button">{id ? 'Save changes' : 'Add destination'}</button>
        </div>
      </form>
    </main>
  );
}

function ReferenceCount({ destination }: { destination: DestinationResource }) {
  return (
    <div className="reference-note">
      <Link2 />
      <span>
        <strong>{destination.redirectCount ?? 0} redirects</strong> point here. Archiving is blocked
        while references remain.
      </span>
    </div>
  );
}
