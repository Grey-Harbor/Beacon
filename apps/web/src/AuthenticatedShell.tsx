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
  useRef,
  useState,
  type ClipboardEvent as ReactClipboardEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';
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

interface PaletteAction {
  id: string;
  label: string;
  description: string;
  to: string;
  icon: ReactNode;
  divider?: boolean;
}

const paletteActions: PaletteAction[] = [
  {
    id: 'add-redirect',
    label: 'Add redirect',
    description: 'Create a new redirect',
    to: '/redirects/new',
    icon: <CirclePlus />,
  },
  {
    id: 'add-destination',
    label: 'Add destination',
    description: 'Create a reusable destination',
    to: '/destinations/new',
    icon: <Target />,
  },
  {
    id: 'reporting',
    label: 'Reporting',
    description: 'Review operational reports',
    to: '/reports',
    icon: <BarChart3 />,
    divider: true,
  },
  {
    id: 'activity',
    label: 'Recent activity',
    description: 'Review recent changes',
    to: '/activity',
    icon: <Activity />,
  },
  {
    id: 'settings',
    label: 'Settings',
    description: 'Manage Beacon settings',
    to: '/settings',
    icon: <Settings />,
  },
];

export function AuthenticatedShell({ session, onLogout, children }: AuthenticatedShellProps) {
  const path = usePath();
  const navigate = useNavigate();
  const shellNavigation = useRef<HTMLElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const paletteTrigger = useRef<HTMLButtonElement>(null);
  const accountTrigger = useRef<HTMLButtonElement>(null);
  const paletteReturnFocus = useRef<HTMLElement | null>(null);
  const accountItem = useRef<HTMLButtonElement>(null);
  const keyDownHandler = useRef<(event: KeyboardEvent) => void>(() => {});
  const resultsId = useId();
  const [query, setQuery] = useState('');
  const [displayValue, setDisplayValue] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searchStatus, setSearchStatus] = useState<SearchStatus>('idle');
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [activeItem, setActiveItem] = useState(-1);
  const [completion, setCompletion] = useState<SearchResult | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [accountError, setAccountError] = useState('');
  const hasQuery = Boolean(query.trim());

  useEffect(() => {
    const controller = new AbortController();
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setSearchStatus('idle');
      setActiveItem(-1);
      return () => controller.abort();
    }

    setSearchStatus('loading');
    const timer = window.setTimeout(() => {
      api<unknown>(`/api/v1/search?q=${encodeURIComponent(query)}`, {
        signal: controller.signal,
      })
        .then((body) => {
          setResults(parseSearchResults(body));
          setSearchStatus('success');
          setActiveItem(-1);
        })
        .catch(() => {
          if (controller.signal.aborted) return;
          setResults([]);
          setSearchStatus('error');
          setActiveItem(-1);
        });
    }, 120);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query]);

  useEffect(() => {
    clearPalette();
    setAccountOpen(false);
  }, [path]);

  useEffect(() => {
    function closeOnOutsideClick(event: PointerEvent) {
      if (!shellNavigation.current?.contains(event.target as Node)) {
        closePalette();
        setAccountOpen(false);
      }
    }
    document.addEventListener('pointerdown', closeOnOutsideClick);
    return () => document.removeEventListener('pointerdown', closeOnOutsideClick);
  }, []);

  useEffect(() => {
    function onWindowKeyDown(event: KeyboardEvent) {
      keyDownHandler.current(event);
    }
    window.addEventListener('keydown', onWindowKeyDown, true);
    return () => window.removeEventListener('keydown', onWindowKeyDown, true);
  }, []);

  useEffect(() => {
    if (accountOpen) window.requestAnimationFrame(() => accountItem.current?.focus());
  }, [accountOpen]);

  function clearPalette() {
    setQuery('');
    setDisplayValue('');
    setResults([]);
    setSearchStatus('idle');
    setPaletteOpen(false);
    setActiveItem(-1);
    setCompletion(null);
  }

  function closePalette(restoreFocus = false) {
    clearPalette();
    if (restoreFocus) focusWithoutScrolling(paletteReturnFocus.current ?? paletteTrigger.current);
  }

  function openPalette(returnFocus: HTMLElement | null) {
    paletteReturnFocus.current = returnFocus;
    setAccountOpen(false);
    setPaletteOpen(true);
    focusWithoutScrolling(searchInput.current);
  }

  function setQueryFromInput(value: string) {
    setQuery(value);
    setDisplayValue(value);
    setCompletion(null);
    setActiveItem(-1);
    setPaletteOpen(true);
  }

  function previewResult(index: number) {
    const result = results[index];
    if (!result) return;
    setActiveItem(index);
    setCompletion(result);
    setDisplayValue(result.title);
  }

  function activateAction(action: PaletteAction) {
    closePalette();
    navigate(action.to);
  }

  function openResult(result: SearchResult) {
    closePalette();
    searchInput.current?.blur();
    navigate(`/${result.kind}s/${result.id}/edit`);
  }

  function activateActiveItem() {
    if (activeItem < 0) return;
    if (hasQuery) {
      const result = results[activeItem];
      if (result) openResult(result);
      return;
    }
    const action = paletteActions[activeItem];
    if (action) activateAction(action);
  }

  function moveActiveItem(key: 'ArrowDown' | 'ArrowUp' | 'Home' | 'End') {
    const count = hasQuery ? results.length : paletteActions.length;
    if (!count) return;
    const next =
      key === 'Home'
        ? 0
        : key === 'End'
          ? count - 1
          : key === 'ArrowDown'
            ? activeItem < 0
              ? 0
              : (activeItem + 1) % count
            : activeItem < 0
              ? count - 1
              : (activeItem - 1 + count) % count;
    if (hasQuery) previewResult(next);
    else setActiveItem(next);
  }

  function restoreTypedQuery() {
    setCompletion(null);
    setDisplayValue(query);
    setActiveItem(-1);
  }

  function handleSearchKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (completion && isTypingKey(event)) {
      event.preventDefault();
      setQueryFromInput(`${query}${event.key}`);
      return;
    }
    if (completion && event.key === 'Backspace') {
      event.preventDefault();
      setQueryFromInput(query.slice(0, -1));
      return;
    }
    if (completion && event.key === 'Delete') {
      event.preventDefault();
      restoreTypedQuery();
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      if (completion) restoreTypedQuery();
      else closePalette(true);
      return;
    }
    if (event.key === 'Tab') {
      closePalette();
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      activateActiveItem();
      return;
    }
    if (
      event.key === 'ArrowDown' ||
      event.key === 'ArrowUp' ||
      event.key === 'Home' ||
      event.key === 'End'
    ) {
      event.preventDefault();
      moveActiveItem(event.key);
    }
  }

  function handleSearchPaste(event: ReactClipboardEvent<HTMLInputElement>) {
    if (!completion) return;
    event.preventDefault();
    setQueryFromInput(`${query}${event.clipboardData.getData('text')}`);
  }

  function handlePaletteShortcut(event: KeyboardEvent) {
    if (
      !isSlashShortcut(event) ||
      event.defaultPrevented ||
      event.metaKey ||
      event.ctrlKey ||
      event.altKey
    ) {
      return;
    }
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (isTextEntry(target)) return;
    event.preventDefault();
    event.stopPropagation();
    openPalette(target ?? paletteTrigger.current);
  }

  keyDownHandler.current = handlePaletteShortcut;

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

  const activeItemId =
    activeItem >= 0 ? `${resultsId}-${hasQuery ? 'result' : 'action'}-${activeItem}` : undefined;

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
                closePalette();
                setAccountOpen((open) => !open);
              }}
            >
              <UserRound />
            </button>
            {accountOpen && (
              <div
                className="account-menu"
                role="menu"
                onKeyDown={(event) => {
                  if (event.key === 'Escape') {
                    event.preventDefault();
                    setAccountOpen(false);
                    accountTrigger.current?.focus();
                  } else if (event.key === 'Tab') {
                    setAccountOpen(false);
                  }
                }}
              >
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
                ref={paletteTrigger}
                className="icon-button menu-trigger"
                aria-label="Open search menu"
                aria-expanded={paletteOpen}
                aria-haspopup="listbox"
                onClick={() => {
                  if (paletteOpen) closePalette();
                  else openPalette(paletteTrigger.current);
                }}
              >
                <Menu />
              </button>
              <Search className="search-icon" aria-hidden="true" />
              <input
                ref={searchInput}
                role="combobox"
                aria-label="Search Beacon"
                aria-autocomplete="both"
                aria-controls={resultsId}
                aria-expanded={paletteOpen}
                aria-activedescendant={activeItemId}
                value={displayValue}
                onFocus={() => {
                  setAccountOpen(false);
                  setPaletteOpen(true);
                }}
                onChange={(event) => setQueryFromInput(event.target.value)}
                onKeyDown={handleSearchKeyDown}
                onPaste={handleSearchPaste}
                placeholder="Find a redirect or destination…"
              />
              {displayValue && (
                <button
                  className="icon-button"
                  aria-label="Clear search"
                  onClick={() => {
                    setQueryFromInput('');
                    focusWithoutScrolling(searchInput.current);
                  }}
                >
                  <X />
                </button>
              )}
            </div>

            {paletteOpen && (
              <Palette
                id={resultsId}
                hasQuery={hasQuery}
                actions={paletteActions}
                results={results}
                status={searchStatus}
                activeItem={activeItem}
                onAction={activateAction}
                onResult={openResult}
                onHighlight={(index) => {
                  if (hasQuery) previewResult(index);
                  else setActiveItem(index);
                }}
              />
            )}
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}

function Palette({
  id,
  hasQuery,
  actions,
  results,
  status,
  activeItem,
  onAction,
  onResult,
  onHighlight,
}: {
  id: string;
  hasQuery: boolean;
  actions: PaletteAction[];
  results: SearchResult[];
  status: SearchStatus;
  activeItem: number;
  onAction(action: PaletteAction): void;
  onResult(result: SearchResult): void;
  onHighlight(index: number): void;
}) {
  return (
    <div className="search-results" id={id} role="listbox" aria-label="Search menu">
      {!hasQuery && (
        <>
          <p className="palette-label">Actions</p>
          {actions.map((action, index) => (
            <div key={action.id}>
              {action.divider && <div className="menu-divider" />}
              <button
                id={`${id}-action-${index}`}
                className={`result-row${activeItem === index ? ' active' : ''}`}
                role="option"
                aria-selected={activeItem === index}
                onMouseEnter={() => onHighlight(index)}
                onClick={() => onAction(action)}
              >
                <span className="result-icon">{action.icon}</span>
                <span>
                  <strong>{action.label}</strong>
                  <small>{action.description}</small>
                </span>
                <ChevronRight />
              </button>
            </div>
          ))}
        </>
      )}
      {hasQuery && status === 'loading' && <SearchMessage icon={<Search />} text="Searching…" />}
      {hasQuery && status === 'error' && (
        <SearchMessage icon={<Search />} text="Search is unavailable. Try again." />
      )}
      {hasQuery && status === 'success' && !results.length && (
        <SearchMessage icon={<Search />} text="No matching assets" />
      )}
      {hasQuery &&
        status === 'success' &&
        results.map((result, index) => (
          <button
            key={`${result.kind}:${result.id}`}
            id={`${id}-result-${index}`}
            className={`result-row${activeItem === index ? ' active' : ''}`}
            role="option"
            aria-selected={activeItem === index}
            onMouseEnter={() => onHighlight(index)}
            onClick={() => onResult(result)}
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

function isTextEntry(target: HTMLElement | null) {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    Boolean(target?.isContentEditable)
  );
}

function isSlashShortcut(event: Pick<KeyboardEvent, 'key' | 'code'>) {
  return event.key === '/' || (event.key === 'Unidentified' && event.code === 'Slash');
}

function isTypingKey(event: ReactKeyboardEvent<HTMLInputElement>) {
  return event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey;
}

function focusWithoutScrolling(element: HTMLElement | null | undefined) {
  if (!element) return;
  try {
    element.focus({ preventScroll: true });
  } catch {
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
