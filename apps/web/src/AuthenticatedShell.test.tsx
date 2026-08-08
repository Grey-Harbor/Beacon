import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { AuthenticatedShell } from './AuthenticatedShell';
import { ProjectLink } from './components';

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

  it('supports keyboard search selection and clears state after navigation', async () => {
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

    fireEvent.change(search, { target: { value: 'doc' } });
    expect(search).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('status')).toHaveTextContent('Searching…');
    await screen.findByRole('option', { name: /Documentation/ });

    fireEvent.keyDown(search, { key: 'ArrowDown' });
    expect(search.getAttribute('aria-activedescendant')).toMatch(/-0$/);
    fireEvent.keyDown(search, { key: 'ArrowDown' });
    expect(search.getAttribute('aria-activedescendant')).toMatch(/-1$/);
    fireEvent.keyDown(search, { key: 'ArrowDown' });
    expect(search.getAttribute('aria-activedescendant')).toMatch(/-1$/);
    fireEvent.keyDown(search, { key: 'Enter' });

    await waitFor(() => expect(window.location.pathname).toBe('/destinations/destination-2/edit'));
    expect(search).toHaveValue('');
    expect(search).toHaveAttribute('aria-expanded', 'false');
  });

  it('supports mouse selection, Escape, no-match, and unavailable states', async () => {
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

    fireEvent.change(search, { target: { value: 'doc' } });
    await screen.findByRole('option', { name: /Documentation/ });
    fireEvent.keyDown(search, { key: 'Escape' });
    expect(search).toHaveValue('doc');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    fireEvent.focus(search);
    fireEvent.click(screen.getByRole('option', { name: /Documentation/ }));
    await waitFor(() => expect(window.location.pathname).toBe('/redirects/redirect-1/edit'));

    act(() => {
      window.history.replaceState(null, '', '/');
      window.dispatchEvent(new Event('beacon:navigate'));
    });
    await waitFor(() => expect(search).toHaveValue(''));
    fireEvent.change(search, { target: { value: 'missing' } });
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('No matching assets'));

    fireEvent.change(search, { target: { value: 'offline' } });
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('Search is unavailable'),
    );
  });

  it('opens the slash menu, roves focus, restores focus, and ignores editor fields', async () => {
    renderShell(<input aria-label="Editor field" />);
    const trigger = screen.getByRole('button', { name: 'Open application menu' });

    fireEvent.keyDown(document, { key: '/' });
    const firstItem = await screen.findByRole('menuitem', { name: /Add redirect/ });
    expect(firstItem).toHaveFocus();
    fireEvent.keyDown(firstItem, { key: 'ArrowDown' });
    expect(screen.getByRole('menuitem', { name: 'Add destination' })).toHaveFocus();
    fireEvent.keyDown(document.activeElement as Element, { key: 'Escape' });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();

    const editor = screen.getByRole('textbox', { name: 'Editor field' });
    editor.focus();
    fireEvent.keyDown(editor, { key: '/' });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(editor).toHaveValue('');
  });

  it('navigates the slash menu from the search field with arrows and Enter', async () => {
    renderShell();
    const search = screen.getByRole('combobox', { name: 'Search Beacon' });
    search.focus();

    fireEvent.keyDown(search, { key: '/' });
    const addRedirect = await screen.findByRole('menuitem', { name: /Add redirect/ });
    expect(addRedirect).toHaveFocus();
    expect(search).toHaveValue('');

    fireEvent.keyDown(addRedirect, { key: 'ArrowDown' });
    const addDestination = screen.getByRole('menuitem', { name: 'Add destination' });
    expect(addDestination).toHaveFocus();
    fireEvent.keyDown(addDestination, { key: 'ArrowUp' });
    expect(addRedirect).toHaveFocus();
    fireEvent.keyDown(addRedirect, { key: 'ArrowDown' });
    fireEvent.keyDown(addDestination, { key: 'Enter' });

    await waitFor(() => expect(window.location.pathname).toBe('/destinations/new'));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
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

    fireEvent.click(screen.getByRole('button', { name: 'Open application menu' }));
    expect(await screen.findByRole('menuitem', { name: /Add redirect/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Open account menu/ }));
    expect(screen.queryByRole('menuitem', { name: /Add redirect/ })).not.toBeInTheDocument();
    expect(screen.getByText('harbor-admin')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('menuitem', { name: 'Sign out' }));
    await waitFor(() => expect(onLogout).toHaveBeenCalledOnce());
    expect(fetch).toHaveBeenCalledWith(
      '/api/v1/session',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('resets an open search when another route is announced', async () => {
    renderShell();
    const search = screen.getByRole('combobox', { name: 'Search Beacon' });
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
  });
});
