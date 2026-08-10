import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { AuthenticatedShell } from './AuthenticatedShell';
import { ApplicationFooter, ProjectLink } from './components';

const session = { authenticated: true, user: { username: 'harbor-admin' } };

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    }),
  );
}

function renderShell(child = <main>Workspace content</main>, onLogout = vi.fn()) {
  return render(
    <AuthenticatedShell session={session} onLogout={onLogout}>
      {child}
    </AuthenticatedShell>,
  );
}

describe('AuthenticatedShell', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/');
    vi.stubGlobal(
      'fetch',
      vi.fn(() => jsonResponse([])),
    );
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('links the brand lockup to home and renders page content', () => {
    window.history.replaceState(null, '', '/reports');
    renderShell();

    const home = screen.getByRole('link', { name: 'Beacon home' });
    expect(home).toHaveAttribute('href', '/');
    expect(home).toHaveTextContent('Beacon');
    expect(home).not.toHaveTextContent('Compactor');
    expect(home.querySelector('img')).toHaveAttribute('src', '/beacon-mark.svg');
    expect(screen.getByText('Workspace content')).toBeInTheDocument();
  });

  it('links related project names to their websites', () => {
    render(
      <>
        <ProjectLink name="Drift" />
        <ProjectLink name="Compactor" />
      </>,
    );

    expect(screen.getByRole('link', { name: 'Drift' })).toHaveAttribute(
      'href',
      'https://drift.greyharborsoftware.com',
    );
    expect(screen.getByRole('link', { name: 'Compactor' })).toHaveAttribute(
      'href',
      'https://compactor.greyharborsoftware.com',
    );
  });

  it('links the application footer to Grey Harbor and the Apache-2.0 license', () => {
    render(<ApplicationFooter />);

    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'By Grey Harbor' })).toHaveAttribute(
      'href',
      'https://www.greyharborsoftware.com',
    );
    expect(screen.getByRole('link', { name: 'Apache-2.0' })).toHaveAttribute('href', '/LICENSE');
  });

  it('opens actions from the search menu and activates them from the input', async () => {
    renderShell();
    const trigger = screen.getByRole('button', { name: 'Open search menu' });
    const search = screen.getByRole('combobox', { name: 'Search Beacon' });

    fireEvent.click(trigger);

    expect(search).toHaveFocus();
    expect(screen.getByRole('listbox', { name: 'Search menu' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Add redirect/ })).toBeInTheDocument();
    expect(screen.queryByText('⌘ N')).not.toBeInTheDocument();
    fireEvent.keyDown(search, { key: 'ArrowDown' });
    expect(search.getAttribute('aria-activedescendant')).toMatch(/action-0$/);
    expect(search).toHaveValue('');
    fireEvent.keyDown(search, { key: 'Enter' });

    await waitFor(() => expect(window.location.pathname).toBe('/redirects/new'));
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('completes asset titles while preserving the typed search query', async () => {
    vi.mocked(fetch).mockImplementation(() =>
      jsonResponse([
        {
          id: 'redirect-1',
          kind: 'redirect',
          title: 'Documentation',
          subtitle: 'https://go.example/docs',
        },
        {
          id: 'destination-2',
          kind: 'destination',
          title: 'Product site',
          subtitle: 'https://example.com',
        },
      ]),
    );
    renderShell();
    const search = screen.getByRole('combobox', { name: 'Search Beacon' });

    fireEvent.click(screen.getByRole('button', { name: 'Open search menu' }));
    fireEvent.change(search, { target: { value: 'doc' } });
    expect(search).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('status')).toHaveTextContent('Searching…');
    await screen.findByRole('option', { name: /Documentation/ });

    fireEvent.keyDown(search, { key: 'ArrowDown' });
    expect(search.getAttribute('aria-activedescendant')).toMatch(/result-0$/);
    expect(search).toHaveValue('Documentation');
    fireEvent.keyDown(search, { key: 'ArrowDown' });
    expect(search.getAttribute('aria-activedescendant')).toMatch(/result-1$/);
    expect(search).toHaveValue('Product site');
    fireEvent.keyDown(search, { key: 'Enter' });

    await waitFor(() => expect(window.location.pathname).toBe('/destinations/destination-2/edit'));
    expect(search).toHaveValue('');
    expect(search).toHaveAttribute('aria-expanded', 'false');
  });

  it('restores a completion before closing and resumes from the typed query', async () => {
    vi.mocked(fetch).mockImplementation(() =>
      jsonResponse([
        {
          id: 'redirect-1',
          kind: 'redirect',
          title: 'Documentation',
          subtitle: 'https://go.example/docs',
        },
      ]),
    );
    renderShell(<button>Page action</button>);
    const pageAction = screen.getByRole('button', { name: 'Page action' });
    const search = screen.getByRole('combobox', { name: 'Search Beacon' });

    pageAction.focus();
    fireEvent.keyDown(pageAction, { key: '/' });
    expect(search).toHaveFocus();
    fireEvent.change(search, { target: { value: 'doc' } });
    await screen.findByRole('option', { name: /Documentation/ });
    fireEvent.keyDown(search, { key: 'ArrowDown' });
    expect(search).toHaveValue('Documentation');
    fireEvent.keyDown(search, { key: 'Escape' });
    expect(search).toHaveValue('doc');
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    fireEvent.keyDown(search, { key: 'ArrowDown' });
    expect(search).toHaveValue('Documentation');
    fireEvent.keyDown(search, { key: 'x' });
    expect(search).toHaveValue('docx');
    fireEvent.keyDown(search, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(pageAction).toHaveFocus();
  });

  it('supports click selection, clear, no-match, and unavailable states', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockImplementationOnce(() =>
        jsonResponse([
          {
            id: 'redirect-1',
            kind: 'redirect',
            title: 'Documentation',
            subtitle: 'https://go.example/docs',
          },
        ]),
      )
      .mockImplementationOnce(() => jsonResponse([]))
      .mockRejectedValueOnce(new Error('offline'));
    renderShell();
    const search = screen.getByRole('combobox', { name: 'Search Beacon' });

    fireEvent.click(screen.getByRole('button', { name: 'Open search menu' }));
    fireEvent.change(search, { target: { value: 'doc' } });
    await screen.findByRole('option', { name: /Documentation/ });
    fireEvent.click(screen.getByRole('option', { name: /Documentation/ }));
    await waitFor(() => expect(window.location.pathname).toBe('/redirects/redirect-1/edit'));

    act(() => {
      window.history.replaceState(null, '', '/');
      window.dispatchEvent(new Event('beacon:navigate'));
    });
    await waitFor(() => expect(search).toHaveValue(''));
    fireEvent.click(screen.getByRole('button', { name: 'Open search menu' }));
    fireEvent.change(search, { target: { value: 'missing' } });
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('No matching assets'));

    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(search).toHaveValue('');
    expect(screen.getByRole('option', { name: /Add redirect/ })).toBeInTheDocument();

    fireEvent.change(search, { target: { value: 'offline' } });
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('Search is unavailable'),
    );
  });

  it('keeps the shell available when search returns an invalid payload', async () => {
    vi.mocked(fetch).mockImplementation(() => jsonResponse(null));
    renderShell();
    const search = screen.getByRole('combobox', { name: 'Search Beacon' });

    fireEvent.click(screen.getByRole('button', { name: 'Open search menu' }));
    fireEvent.change(search, { target: { value: 'docs' } });

    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('Search is unavailable'),
    );
    expect(screen.getByText('Workspace content')).toBeInTheDocument();
  });

  it('opens from slash across route changes and ignores editable fields', () => {
    renderShell(<input aria-label="Editor field" />);
    const trigger = screen.getByRole('button', { name: 'Open search menu' });
    const search = screen.getByRole('combobox', { name: 'Search Beacon' });

    fireEvent.keyDown(trigger, { key: '/' });
    expect(search).toHaveFocus();
    expect(screen.getByRole('option', { name: /Add redirect/ })).toBeInTheDocument();
    fireEvent.keyDown(search, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();

    const editor = screen.getByRole('textbox', { name: 'Editor field' });
    editor.focus();
    fireEvent.keyDown(editor, { key: '/' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    act(() => {
      window.history.pushState(null, '', '/settings');
      window.dispatchEvent(new Event('beacon:navigate'));
    });
    fireEvent.keyDown(trigger, { key: 'Unidentified', code: 'Slash' });
    expect(search).toHaveFocus();
  });

  it('keeps overlays exclusive and signs out from the account popover', async () => {
    const onLogout = vi.fn().mockResolvedValue(undefined);
    vi.mocked(fetch).mockImplementation((input, init) => {
      if (String(input) === '/api/v1/session' && init?.method === 'DELETE') {
        return Promise.resolve(new Response(null, { status: 204 }));
      }
      return jsonResponse([]);
    });
    renderShell(undefined, onLogout);

    fireEvent.click(screen.getByRole('button', { name: 'Open search menu' }));
    expect(screen.getByRole('option', { name: /Add redirect/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Open account menu/ }));
    expect(screen.queryByRole('option', { name: /Add redirect/ })).not.toBeInTheDocument();
    expect(screen.getByText('harbor-admin')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('menuitem', { name: 'Sign out' }));
    await waitFor(() => expect(onLogout).toHaveBeenCalledOnce());
    expect(fetch).toHaveBeenCalledWith('/api/v1/session', { method: 'DELETE' });
  });

  it('resets an open search when another route is announced', async () => {
    renderShell();
    const search = screen.getByRole('combobox', { name: 'Search Beacon' });
    fireEvent.click(screen.getByRole('button', { name: 'Open search menu' }));
    fireEvent.change(search, { target: { value: 'docs' } });

    act(() => {
      window.history.pushState(null, '', '/settings');
      window.dispatchEvent(new Event('beacon:navigate'));
    });

    await waitFor(() => expect(search).toHaveValue(''));
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});

describe('App authentication scope', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('does not render authenticated navigation on sign-in', async () => {
    window.history.replaceState(null, '', '/');
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        if (String(input) === '/api/v1/setup/status') return jsonResponse({ configured: true });
        if (String(input) === '/api/v1/session') {
          return jsonResponse({ authenticated: false, user: null });
        }
        return jsonResponse({});
      }),
    );

    render(<App />);
    expect(await screen.findByRole('button', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Beacon home' })).not.toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });
});
