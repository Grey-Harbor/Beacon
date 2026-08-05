import { AppError } from './errors.js';

const prohibitedHeaders = new Set([
  'location',
  'content-length',
  'connection',
  'transfer-encoding',
  'date',
  'server',
]);

export function canonicalizeSourceUrl(value: string): string {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new AppError(400, 'invalid_source_url', 'Source URL must be an absolute URL');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new AppError(400, 'invalid_source_url', 'Source URL must use HTTP or HTTPS');
  }
  if (parsed.username || parsed.password || !parsed.hostname || value.includes('\\')) {
    throw new AppError(400, 'invalid_source_url', 'Source URL contains unsupported authority data');
  }
  const protocol = parsed.protocol.toLowerCase();
  const normalizedHostname = parsed.hostname.toLowerCase();
  const host = normalizedHostname.startsWith('[')
    ? normalizedHostname.slice(1, -1)
    : normalizedHostname;
  const port =
    parsed.port &&
    !(
      (protocol === 'http:' && parsed.port === '80') ||
      (protocol === 'https:' && parsed.port === '443')
    )
      ? `:${parsed.port}`
      : '';
  const authority = host.includes(':') ? `[${host}]${port}` : `${host}${port}`;
  const withoutFragment = value.split('#', 1)[0]!;
  const withoutQuery = withoutFragment.split('?', 1)[0]!;
  const authorityStart = withoutQuery.indexOf('://') + 3;
  const slash = withoutQuery.indexOf('/', authorityStart);
  const rawPath = slash === -1 ? '/' : withoutQuery.slice(slash) || '/';
  if (/%(?![0-9A-Fa-f]{2})/.test(rawPath)) {
    throw new AppError(400, 'invalid_source_url', 'Source URL contains malformed percent encoding');
  }
  return `${protocol}//${authority}${rawPath}`;
}

export function validateDestinationUrl(value: string): string {
  try {
    const url = new URL(value);
    if (!url.protocol || !url.href) throw new Error('not absolute');
    return url.href;
  } catch {
    throw new AppError(400, 'invalid_destination_url', 'Destination must be an absolute URL');
  }
}

export function validateResponseHeaders(headers: Record<string, string>): Record<string, string> {
  for (const [name, value] of Object.entries(headers)) {
    if (!/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/.test(name)) {
      throw new AppError(400, 'invalid_response_header', `Invalid response header name: ${name}`);
    }
    if (prohibitedHeaders.has(name.toLowerCase())) {
      throw new AppError(400, 'prohibited_response_header', `${name} is controlled by Compactor`);
    }
    if (/[^\t\x20-\x7e\x80-\xff]/.test(value)) {
      throw new AppError(
        400,
        'invalid_response_header',
        `Invalid value for response header ${name}`,
      );
    }
  }
  return headers;
}

export function deriveSlug(sourceUrl: string): string {
  const url = new URL(canonicalizeSourceUrl(sourceUrl));
  const last = url.pathname.split('/').filter(Boolean).at(-1) ?? url.hostname;
  const slug = decodeURIComponent(last)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 100);
  return slug || 'redirect';
}
