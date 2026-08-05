import { useCallback, useSyncExternalStore, type AnchorHTMLAttributes } from 'react';

function subscribe(listener: () => void) {
  window.addEventListener('popstate', listener);
  window.addEventListener('beacon:navigate', listener);
  return () => {
    window.removeEventListener('popstate', listener);
    window.removeEventListener('beacon:navigate', listener);
  };
}

export function usePath() {
  return useSyncExternalStore(
    subscribe,
    () => window.location.pathname,
    () => '/',
  );
}

export function useNavigate() {
  return useCallback((to: string, options?: { replace?: boolean }) => {
    if (!to.startsWith('/')) throw new Error('Beacon navigation requires a same-origin path');
    if (options?.replace) window.history.replaceState(null, '', to);
    else window.history.pushState(null, '', to);
    window.dispatchEvent(new Event('beacon:navigate'));
  }, []);
}

export function Link({
  to,
  onClick,
  ...props
}: Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & { to: string }) {
  const navigate = useNavigate();
  return (
    <a
      {...props}
      href={to}
      onClick={(event) => {
        onClick?.(event);
        if (
          !event.defaultPrevented &&
          event.button === 0 &&
          !event.metaKey &&
          !event.ctrlKey &&
          !event.shiftKey &&
          !event.altKey
        ) {
          event.preventDefault();
          navigate(to);
        }
      }}
    />
  );
}
