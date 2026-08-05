import { ArrowLeft } from 'lucide-react';
import type { InputHTMLAttributes, ReactNode } from 'react';
import { Link } from './router';

export function Loading() {
  return (
    <main className="centered-page" aria-live="polite">
      <div className="brand-mark">B</div>
      <p className="muted">Preparing your workspace…</p>
    </main>
  );
}

export function AuthShell({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <main className="auth-page">
      <section className="auth-intro">
        <div className="brand-lockup">
          <span className="brand-mark">B</span>
          <span>Beacon</span>
        </div>
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p className="lede">
            A calm place to manage the redirect infrastructure Compactor serves.
          </p>
        </div>
      </section>
      <section className="auth-panel">{children}</section>
    </main>
  );
}

export function WorkspaceHeader({
  label,
  title,
  actions,
}: {
  label: string;
  title: string;
  actions?: ReactNode;
}) {
  return (
    <header className="workspace-header">
      <Link className="back-link" to="/">
        <ArrowLeft /> Home
      </Link>
      <div className="workspace-title">
        <p className="eyebrow">{label}</p>
        <h1>{title}</h1>
      </div>
      <div className="header-actions">{actions}</div>
    </header>
  );
}

export function Field({
  label,
  hint,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input {...props} />
      {hint && <small>{hint}</small>}
    </label>
  );
}

export function ErrorMessage({ children }: { children: ReactNode }) {
  return (
    <div className="error-message" role="alert">
      {children}
    </div>
  );
}
