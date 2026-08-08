import type { InputHTMLAttributes, ReactNode } from 'react';

export function BrandMark({ small = false }: { small?: boolean }) {
  return (
    <span className={`brand-mark${small ? ' small' : ''}`} aria-hidden="true">
      <img src="/beacon-mark.svg" alt="" />
    </span>
  );
}

export function Loading() {
  return (
    <main className="centered-page" aria-live="polite">
      <BrandMark />
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
          <BrandMark />
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

export function PageHeader({
  label,
  title,
  actions,
}: {
  label: string;
  title: string;
  actions?: ReactNode;
}) {
  return (
    <header className="page-header">
      <div className="page-title">
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
