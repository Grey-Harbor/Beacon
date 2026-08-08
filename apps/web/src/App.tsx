'use client';

import { useEffect, useState } from 'react';
import { AuthenticatedShell } from './AuthenticatedShell';
import { api } from './api';
import { Loading } from './components';
import { ActivityPage } from './screens/ActivityScreen';
import { LoginPage, SetupPage } from './screens/AuthScreens';
import { DestinationEditorPage } from './screens/DestinationEditorScreen';
import { HomePage } from './screens/HomeScreen';
import { RedirectEditorPage } from './screens/RedirectEditorScreen';
import { ReportsPage } from './screens/ReportsScreen';
import { SettingsPage } from './screens/SettingsScreen';
import { usePath } from './router';
import type { Session } from './types';

export function App() {
  const path = usePath();
  const [ready, setReady] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [session, setSession] = useState<Session>({ authenticated: false, user: null });

  async function refreshSession() {
    const [setup, currentSession] = await Promise.all([
      api<{ configured: boolean }>('/api/v1/setup/status'),
      api<Session>('/api/v1/session'),
    ]);
    setConfigured(setup.configured);
    setSession(currentSession);
    setReady(true);
  }

  useEffect(() => void refreshSession(), []);

  if (!ready) return <Loading />;
  if (!configured) return <SetupPage onComplete={refreshSession} />;
  if (!session.authenticated) return <LoginPage onComplete={refreshSession} />;

  let page;
  if (path === '/redirects/new' || /^\/redirects\/[^/]+\/edit$/.test(path)) {
    page = <RedirectEditorPage />;
  } else if (path === '/destinations/new' || /^\/destinations\/[^/]+\/edit$/.test(path)) {
    page = <DestinationEditorPage />;
  } else if (path === '/activity') {
    page = <ActivityPage />;
  } else if (path === '/reports') {
    page = <ReportsPage />;
  } else if (path === '/settings') {
    page = <SettingsPage />;
  } else {
    page = <HomePage />;
  }

  return (
    <AuthenticatedShell session={session} onLogout={refreshSession}>
      {page}
    </AuthenticatedShell>
  );
}
