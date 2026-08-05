import { useState, type FormEvent } from 'react';
import { api, json } from '../api';
import { AuthShell, ErrorMessage, Field } from '../components';
import { errorMessage } from '../presentation';

interface AuthPageProps {
  onComplete(): Promise<void>;
}

export function SetupPage({ onComplete }: AuthPageProps) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api(
        '/api/v1/setup',
        json('POST', Object.fromEntries(new FormData(event.currentTarget))),
      );
      await onComplete();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell eyebrow="First run" title="Set up Beacon">
      <form className="stack" onSubmit={submit}>
        <Field
          label="Setup token"
          name="setupToken"
          type="password"
          autoComplete="one-time-code"
          required
        />
        <Field label="Admin username" name="username" autoComplete="username" required />
        <Field
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          hint="Use at least 12 characters."
          required
          minLength={12}
        />
        {error && <ErrorMessage>{error}</ErrorMessage>}
        <button className="primary-button" disabled={busy}>
          {busy ? 'Setting up…' : 'Create workspace'}
        </button>
      </form>
    </AuthShell>
  );
}

export function LoginPage({ onComplete }: AuthPageProps) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api(
        '/api/v1/session',
        json('POST', Object.fromEntries(new FormData(event.currentTarget))),
      );
      await onComplete();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell eyebrow="Welcome back" title="Continue your work">
      <form className="stack" onSubmit={submit}>
        <Field label="Username" name="username" autoComplete="username" required autoFocus />
        <Field
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
        {error && <ErrorMessage>{error}</ErrorMessage>}
        <button className="primary-button" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </AuthShell>
  );
}
