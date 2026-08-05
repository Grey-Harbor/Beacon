'use client';

import { useEffect, useState } from 'react';
import { api } from './api';
import { Loading } from './components';
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

  if (path === '/redirects/new' || /^\/redirects\/[^/]+\/edit$/.test(path)) {
    return <RedirectEditorPage />;
  }
  if (path === '/destinations/new' || /^\/destinations\/[^/]+\/edit$/.test(path)) {
    return <DestinationEditorPage />;
  }
  if (path === '/reports') return <ReportsPage />;
  if (path === '/settings') return <SettingsPage />;
  return <HomePage session={session} onLogout={refreshSession} />;
}
