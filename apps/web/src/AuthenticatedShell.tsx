import type { SearchResult } from '@beacon/shared';
import {
  Activity,
  BarChart3,
  ChevronRight,
  CirclePlus,
  Link2,
  LogOut,
  Menu,
  Search,
  Settings,
  Target,
  UserRound,
  X,
} from 'lucide-react';
import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';
import { flushSync } from 'react-dom';
import { api, json } from './api';
import { BrandMark } from './components';
import { Link, useNavigate, usePath } from './router';
import type { Session } from './types';

interface AuthenticatedShellProps {
  session: Session;
  onLogout(): Promise<void>;
  children: ReactNode;
}

type SearchStatus = 'idle' | 'loading' | 'success' | 'error';

export function AuthenticatedShell({ session, onLogout, children }: AuthenticatedShellProps) {
  const path = usePath();
  const navigate = useNavigate();
  const shellNavigation = useRef<HTMLElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const menuTrigger = useRef<HTMLButtonElement>(null);
  const accountTrigger = useRef<HTMLButtonElement>(null);
  const menuItems = useRef<Array<HTMLButtonElement | null>>([]);
  const menuOpenRef = useRef(false);
  const accountItem = useRef<HTMLButtonElement>(null);
  const menuReturnFocus = useRef<HTMLElement | null>(null);
  const resultsId = useId();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searchStatus, setSearchStatus] = useState<SearchStatus>('idle');
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeResult, setActiveResult] = useState(-1);
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [accountError, setAccountError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setSearchStatus('idle');
      setActiveResult(-1);
      return () => controller.abort();
    }

    setSearchStatus('loading');
    const timer = window.setTimeout(() => {
      api<unknown>(`/api/v1/search?q=${encodeURIComponent(query)}`, {
        signal: controller.signal,
      })
        .then((body) => {
          const matches = parseSearchResults(body);
          setResults(matches);
          setSearchStatus('success');
          setActiveResult(-1);
        })
        .catch((reason: unknown) => {
          if (controller.signal.aborted) return;
          setResults([]);
          setSearchStatus('error');
          setActiveResult(-1);
        });
    }, 120);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query]);

  useLayoutEffect(() => {
    setQuery('');
    setResults([]);
    setSearchStatus('idle');
    setSearchOpen(false);
    setActiveResult(-1);
    setApplicationMenuOpen(false);
    setAccountOpen(false);
  }, [path]);

  useEffect(() => {
    function closeOnOutsideClick(event: PointerEvent) {
      if (!shellNavigation.current?.contains(event.target as Node)) closeOverlays();
    }
    document.addEventListener('pointerdown', closeOnOutsideClick);
    return () => document.removeEventListener('pointerdown', closeOnOutsideClick);
  }, []);

  useEffect(() => {
    function handleApplicationKeyDown(event: KeyboardEvent) {
      if (
        isSlashShortcut(event) &&
        !event.defaultPrevented &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey
      ) {
        const target = event.target instanceof HTMLElement ? event.target : null;
        if (isTextEntry(target) && target !== searchInput.current) return;
        event.preventDefault();
        event.stopPropagation();
        openApplicationMenu(target ?? menuTrigger.current);
        return;
      }
      if (!menuOpenRef.current) return;
      const items = menuItems.current.filter((item): item is HTMLButtonElement => Boolean(item));
      const current = items.indexOf(document.activeElement as HTMLButtonElement);
      if (event.key === 'Tab') {
        setApplicationMenuOpen(false);
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        closeApplicationMenu(true);
        return;
      }
      if ((event.key === 'Enter' || event.key === ' ') && current >= 0) {
        event.preventDefault();
        event.stopPropagation();
        items[current]?.click();
        return;
      }
      if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      event.stopPropagation();
      if (!items.length) return;
      const next =
        event.key === 'Home'
          ? 0
          : event.key === 'End'
            ? items.length - 1
            : event.key === 'ArrowDown'
              ? current < 0
                ? 0
                : (current + 1) % items.length
              : current < 0
                ? items.length - 1
                : (current - 1 + items.length) % items.length;
      focusWithoutScrolling(items[next]);
    }

    document.addEventListener('keydown', handleApplicationKeyDown, true);
    return () => document.removeEventListener('keydown', handleApplicationKeyDown, true);
  }, []);

  useEffect(() => {
    if (accountOpen) window.requestAnimationFrame(() => accountItem.current?.focus());
  }, [accountOpen]);

  function closeOverlays() {
    setSearchOpen(false);
    setActiveResult(-1);
    setApplicationMenuOpen(false);
    setAccountOpen(false);
  }

  function setApplicationMenuOpen(open: boolean) {
    menuOpenRef.current = open;
    setMenuOpen(open);
  }

  function openApplicationMenu(returnFocus: HTMLElement | null) {
    // Safari only accepts the programmatic focus reliably while the opening
    // keyboard or pointer interaction is still being processed. Mount the
    // menu and move focus in that same interaction rather than waiting for an
    // effect after the browser has completed it.
    flushSync(() => {
      menuReturnFocus.current = returnFocus;
      setSearchOpen(false);
      setActiveResult(-1);
      setAccountOpen(false);
      setApplicationMenuOpen(true);
    });
    focusWithoutScrolling(menuItems.current[0]);
  }

  function closeApplicationMenu(restoreFocus = false) {
    setApplicationMenuOpen(false);
    if (restoreFocus) {
      focusWithoutScrolling(menuReturnFocus.current ?? menuTrigger.current);
    }
  }

  function openResult(result: SearchResult) {
    setQuery('');
    closeOverlays();
    searchInput.current?.blur();
    navigate(`/${result.kind}s/${result.id}/edit`);
  }

  function handleSearchKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (menuOpen) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      setSearchOpen(false);
      setActiveResult(-1);
      return;
    }
    if (event.key === 'ArrowDown') {
      if (!results.length) return;
      event.preventDefault();
      setSearchOpen(true);
      setActiveResult((current) => Math.min(current + 1, results.length - 1));
      return;
    }
    if (event.key === 'ArrowUp') {
      if (!results.length) return;
      event.preventDefault();
      setSearchOpen(true);
      setActiveResult((current) => (current < 0 ? results.length - 1 : Math.max(current - 1, 0)));
      return;
    }
    if (event.key === 'Enter' && activeResult >= 0 && results[activeResult]) {
      event.preventDefault();
      openResult(results[activeResult]);
    }
  }

  function handleAccountKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.preventDefault();
      setAccountOpen(false);
      window.requestAnimationFrame(() => accountTrigger.current?.focus());
    } else if (event.key === 'Tab') {
      setAccountOpen(false);
    }
  }

  async function logout() {
    setAccountError('');
    try {
      await api('/api/v1/session', json('DELETE'));
      setAccountOpen(false);
      await onLogout();
    } catch {
      setAccountError('Unable to sign out. Try again.');
    }
  }

  const activeResultId = activeResult >= 0 ? `${resultsId}-${activeResult}` : undefined;

  return (
    <div className="authenticated-shell">
      <header className="global-navigation" ref={shellNavigation}>
        <div className="navigation-primary-row">
          <Link className="brand-home-link" to="/" aria-label="Beacon home">
            <BrandMark small />
            <span className="brand-name">Beacon</span>
          </Link>
          <div className="account-control">
            <button
              ref={accountTrigger}
              className="icon-button account-trigger"
              aria-label={`Open account menu for ${session.user?.username ?? 'administrator'}`}
              aria-expanded={accountOpen}
              aria-haspopup="menu"
              onClick={() => {
                setAccountError('');
                setSearchOpen(false);
                setApplicationMenuOpen(false);
                setAccountOpen((open) => !open);
              }}
            >
              <UserRound />
            </button>
            {accountOpen && (
              <div className="account-menu" role="menu" onKeyDown={handleAccountKeyDown}>
                <p className="account-name">{session.user?.username}</p>
                {accountError && (
                  <p className="account-error" role="alert">
                    {accountError}
                  </p>
                )}
                <button ref={accountItem} role="menuitem" onClick={() => void logout()}>
                  <LogOut /> Sign out
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="navigation-search-row">
          <div className="search-frame">
            <div className="search-row">
              <button
                ref={menuTrigger}
                className="icon-button menu-trigger"
                aria-label="Open application menu"
                aria-expanded={menuOpen}
                aria-haspopup="menu"
                onClick={() => {
                  if (menuOpen) closeApplicationMenu();
                  else openApplicationMenu(menuTrigger.current);
                }}
              >
                <Menu />
              </button>
              <Search className="search-icon" aria-hidden="true" />
              <input
                ref={searchInput}
                role="combobox"
                aria-label="Search Beacon"
                aria-autocomplete="list"
                aria-controls={resultsId}
                aria-expanded={searchOpen && Boolean(query.trim())}
                aria-activedescendant={activeResultId}
                autoFocus={path === '/'}
                value={query}
                onFocus={() => {
                  setApplicationMenuOpen(false);
                  setAccountOpen(false);
                  if (query.trim()) setSearchOpen(true);
                }}
                onChange={(event) => {
                  const value = event.target.value;
                  setQuery(value);
                  setSearchOpen(Boolean(value.trim()));
                  setActiveResult(-1);
                  setApplicationMenuOpen(false);
                  setAccountOpen(false);
                }}
                onKeyDown={handleSearchKeyDown}
                placeholder="Find a redirect or destination…"
              />
              {query && (
                <button
                  className="icon-button"
                  aria-label="Clear search"
                  onClick={() => {
                    setQuery('');
                    setSearchOpen(false);
                    searchInput.current?.focus();
                  }}
                >
                  <X />
                </button>
              )}
            </div>

            {menuOpen && (
              <ApplicationMenu itemRefs={menuItems} onClose={() => closeApplicationMenu()} />
            )}
            {searchOpen && query.trim() && (
              <SearchResults
                id={resultsId}
                activeResult={activeResult}
                results={results}
                status={searchStatus}
                onActivate={openResult}
                onHighlight={setActiveResult}
              />
            )}
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}

function SearchResults({
  id,
  activeResult,
  results,
  status,
  onActivate,
  onHighlight,
}: {
  id: string;
  activeResult: number;
  results: SearchResult[];
  status: SearchStatus;
  onActivate(result: SearchResult): void;
  onHighlight(index: number): void;
}) {
  return (
    <div className="search-results" id={id} role="listbox" aria-label="Search suggestions">
      {status === 'loading' && <SearchMessage icon={<Search />} text="Searching…" />}
      {status === 'error' && (
        <SearchMessage icon={<Search />} text="Search is unavailable. Try again." />
      )}
      {status === 'success' && !results.length && (
        <SearchMessage icon={<Search />} text="No matching assets" />
      )}
      {status === 'success' &&
        results.map((result, index) => (
          <button
            key={`${result.kind}:${result.id}`}
            id={`${id}-${index}`}
            className={`result-row${activeResult === index ? ' active' : ''}`}
            role="option"
            aria-selected={activeResult === index}
            tabIndex={-1}
            onMouseDown={(event) => event.preventDefault()}
            onMouseEnter={() => onHighlight(index)}
            onClick={() => onActivate(result)}
          >
            <span className={`result-icon ${result.kind}`}>
              {result.kind === 'redirect' ? <Link2 /> : <Target />}
            </span>
            <span>
              <strong>{result.title}</strong>
              <small>{result.subtitle}</small>
            </span>
            <ChevronRight />
          </button>
        ))}
    </div>
  );
}

function SearchMessage({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="search-message" role="status">
      {icon}
      <span>{text}</span>
    </div>
  );
}

function ApplicationMenu({
  itemRefs,
  onClose,
}: {
  itemRefs: { current: Array<HTMLButtonElement | null> };
  onClose(): void;
}) {
  const navigate = useNavigate();
  const links = [
    { label: 'Add redirect', to: '/redirects/new', icon: <CirclePlus />, shortcut: '⌘ N' },
    { label: 'Add destination', to: '/destinations/new', icon: <Target /> },
    { label: 'Reporting', to: '/reports', icon: <BarChart3 />, divider: true },
    { label: 'Recent activity', to: '/activity', icon: <Activity /> },
    { label: 'Settings', to: '/settings', icon: <Settings /> },
  ];

  return (
    <div className="app-menu" role="menu">
      <p className="menu-label">Create</p>
      {links.map((link, index) => (
        <div key={link.to} role="none">
          {link.divider && <div className="menu-divider" />}
          <button
            ref={(item) => {
              itemRefs.current[index] = item;
            }}
            type="button"
            role="menuitem"
            tabIndex={-1}
            onClick={() => {
              onClose();
              navigate(link.to);
            }}
          >
            {link.icon} {link.label} <span>{link.shortcut}</span>
          </button>
        </div>
      ))}
    </div>
  );
}

function isTextEntry(target: HTMLElement | null) {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    Boolean(target?.isContentEditable)
  );
}

function isSlashShortcut(event: KeyboardEvent) {
  return event.key === '/' || (event.key === 'Unidentified' && event.code === 'Slash');
}

function focusWithoutScrolling(element: HTMLElement | null | undefined) {
  if (!element) return;
  try {
    element.focus({ preventScroll: true });
  } catch {
    // Older Safari releases do not support focus options, but still support
    // programmatic focus without them.
    element.focus();
  }
}

function parseSearchResults(value: unknown): SearchResult[] {
  if (!Array.isArray(value) || !value.every(isSearchResult)) {
    throw new Error('Search response was invalid');
  }
  return value;
}

function isSearchResult(value: unknown): value is SearchResult {
  if (!value || typeof value !== 'object') return false;
  const result = value as Record<string, unknown>;
  return (
    typeof result.id === 'string' &&
    (result.kind === 'redirect' || result.kind === 'destination') &&
    typeof result.title === 'string' &&
    typeof result.subtitle === 'string'
  );
}
