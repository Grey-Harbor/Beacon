import type { Metadata } from 'next';

export const siteName = 'Beacon';
export const siteUrl = 'https://beacon.greyharborsoftware.com';
export const siteDescription =
  'Search-first management for self-hosted redirect infrastructure, with authoritative data in Drift and redirect execution by Compactor.';
export const siteKeywords = [
  'redirect management',
  'self-hosted redirects',
  'URL infrastructure',
  'redirect operations',
  'Drift',
  'Compactor',
  'TypeScript',
  'Node.js',
] as const;

export const socialCard = {
  url: '/brand/social-card.png',
  width: 1731,
  height: 909,
  alt: 'Beacon redirect management for self-hosted infrastructure',
} as const;

function withTrailingSlash(path: string): string {
  if (path === '/') {
    return path;
  }

  return path.endsWith('/') ? path : `${path}/`;
}

export function buildPageMetadata({
  title,
  description,
  canonicalPath,
}: {
  title: string;
  description: string | undefined;
  canonicalPath: string;
}): Metadata {
  const canonical = withTrailingSlash(canonicalPath);
  const resolvedDescription = description ?? siteDescription;

  return {
    title,
    description: resolvedDescription,
    alternates: {
      canonical,
    },
    openGraph: {
      title,
      description: resolvedDescription,
      url: canonical,
      siteName,
      type: 'website',
      images: [socialCard],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: resolvedDescription,
      images: [socialCard.url],
    },
  };
}
