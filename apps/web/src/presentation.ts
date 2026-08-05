import { ApiError } from './api';

export function errorMessage(reason: unknown) {
  return reason instanceof Error ? reason.message : 'Something went wrong';
}

export function conflictMessage(reason: unknown) {
  return reason instanceof ApiError && reason.status === 409
    ? `${reason.message}. Reload the current record before trying again.`
    : errorMessage(reason);
}

export function parseHeaders(value: string) {
  return Object.fromEntries(
    value
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const separator = line.indexOf(':');
        if (separator < 1) throw new Error(`Invalid header line: ${line}`);
        return [line.slice(0, separator).trim(), line.slice(separator + 1).trim()];
      }),
  );
}

export function deriveSlug(value: string) {
  try {
    const url = new URL(value);
    const segment = url.pathname.split('/').filter(Boolean).at(-1) ?? url.hostname;
    return decodeURIComponent(segment)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 100);
  } catch {
    return '';
  }
}

export function relativeTime(value: string) {
  const minutes = Math.round((Date.now() - new Date(value).getTime()) / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.round(hours / 24);
  return days < 30 ? `${days}d ago` : new Date(value).toLocaleDateString();
}

export function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}
