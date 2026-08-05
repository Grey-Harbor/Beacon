import type { ActivityRecord, DestinationResource, RedirectResource } from '@beacon/shared';
import type { DriftVertex } from './drift.js';
import { AppError } from './errors.js';

export const RECORD_TYPES = {
  redirect: 'beacon.redirect',
  destination: 'beacon.destination',
  event: 'beacon.event',
  activity: 'beacon.activity',
  admin: 'beacon.admin',
} as const;

export function recordData(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new AppError(502, 'invalid_drift_record', 'Drift record has invalid application data');
  }
  return value as Record<string, unknown>;
}

export function destinationFromVertex(
  vertex: DriftVertex,
  redirectCount?: number,
): DestinationResource {
  if (vertex.type !== RECORD_TYPES.destination) {
    throw new AppError(502, 'invalid_graph', 'Expected destination');
  }
  const url = recordData(vertex.data).url;
  if (typeof url !== 'string') {
    throw new AppError(502, 'invalid_graph', 'Destination URL is missing');
  }
  return {
    id: vertex.id,
    title: vertex.title ?? 'Untitled destination',
    url,
    version: vertex.version,
    updatedAt: vertex.updatedAt,
    ...(redirectCount === undefined ? {} : { redirectCount }),
  };
}

export function redirectFromVertices(
  vertex: DriftVertex,
  destination: DriftVertex,
): RedirectResource {
  if (vertex.type !== RECORD_TYPES.redirect) {
    throw new AppError(502, 'invalid_graph', 'Expected redirect');
  }
  const data = recordData(vertex.data);
  const statusCode = Number(data.statusCode);
  if (![301, 302, 303, 307, 308].includes(statusCode)) {
    throw new AppError(502, 'invalid_graph', 'Redirect status code is invalid');
  }
  if (typeof data.canonicalUrl !== 'string') {
    throw new AppError(502, 'invalid_graph', 'Redirect canonical URL is missing');
  }
  return {
    id: vertex.id,
    title: vertex.title ?? 'Untitled redirect',
    slug: vertex.slug ?? '',
    sourceUrl: data.canonicalUrl,
    status: vertex.status === 'disabled' ? 'disabled' : 'active',
    statusCode: statusCode as RedirectResource['statusCode'],
    responseHeaders: (data.responseHeaders ?? {}) as Record<string, string>,
    destination: destinationFromVertex(destination),
    version: vertex.version,
    updatedAt: vertex.updatedAt,
  };
}

export function activityFromVertex(vertex: DriftVertex): ActivityRecord {
  const data = recordData(vertex.data);
  return {
    id: vertex.externalId ?? vertex.id,
    action: String(data.action ?? 'edited'),
    resourceType: data.resourceType === 'destination' ? 'destination' : 'redirect',
    resourceId: String(data.resourceId ?? ''),
    resourceTitle: String(data.resourceTitle ?? vertex.title ?? 'Untitled'),
    actor: String(data.actor ?? 'admin'),
    occurredAt: String(data.occurredAt ?? vertex.createdAt),
  };
}
