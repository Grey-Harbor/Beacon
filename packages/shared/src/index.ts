import { z } from 'zod';

export const REDIRECT_STATUSES = [301, 302, 303, 307, 308] as const;
export const EVENT_OUTCOMES = [
  'redirected',
  'not_found',
  'invalid_request',
  'source_error',
] as const;

export const responseHeadersSchema = z.record(z.string(), z.string()).default({});

export const redirectInputSchema = z.object({
  title: z.string().trim().min(1).max(160),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .max(100),
  sourceUrl: z.string().trim().min(1),
  destinationId: z.string().min(1).optional(),
  destination: z
    .object({ title: z.string().trim().min(1).max(160), url: z.string().trim().min(1) })
    .optional(),
  status: z.enum(['active', 'disabled']).default('active'),
  statusCode: z.union([
    z.literal(301),
    z.literal(302),
    z.literal(303),
    z.literal(307),
    z.literal(308),
  ]),
  responseHeaders: responseHeadersSchema,
  version: z.number().int().positive().optional(),
});

export const destinationInputSchema = z.object({
  title: z.string().trim().min(1).max(160),
  url: z.string().trim().min(1),
  version: z.number().int().positive().optional(),
});

export const compactorEventSchema = z
  .object({
    event_id: z.string().trim().min(1),
    redirect_id: z.string().trim().min(1).nullable(),
    occurred_at: z.iso.datetime({ offset: true }),
    duration_ms: z.number().nonnegative().finite(),
    outcome: z.enum(EVENT_OUTCOMES),
    client: z
      .object({ address: z.string().nullable(), user_agent: z.string().nullable() })
      .strict(),
    request: z
      .object({
        method: z.string(),
        scheme: z.string(),
        host: z.string(),
        path: z.string(),
        query: z.string().nullable(),
        protocol: z.string(),
        headers: z.record(z.string(), z.string()),
      })
      .strict(),
    response: z
      .object({ status_code: z.number().int().min(100).max(599), location: z.string().nullable() })
      .strict(),
  })
  .strict();

export type RedirectInput = z.infer<typeof redirectInputSchema>;
export type DestinationInput = z.infer<typeof destinationInputSchema>;
export type CompactorEvent = z.infer<typeof compactorEventSchema>;

export interface RedirectResource {
  id: string;
  title: string;
  slug: string;
  sourceUrl: string;
  status: 'active' | 'disabled';
  statusCode: (typeof REDIRECT_STATUSES)[number];
  responseHeaders: Record<string, string>;
  destination: DestinationResource;
  version: number;
  updatedAt: string;
}

export interface DestinationResource {
  id: string;
  title: string;
  url: string;
  version: number;
  updatedAt: string;
  redirectCount?: number;
}

export interface SearchResult {
  id: string;
  kind: 'redirect' | 'destination';
  title: string;
  subtitle: string;
}

export interface ActivityRecord {
  id: string;
  action: string;
  resourceType: 'redirect' | 'destination';
  resourceId: string;
  resourceTitle: string;
  actor: string;
  occurredAt: string;
}

export interface EventRecord extends CompactorEvent {}

export interface ReportRow {
  redirectId: string | null;
  redirected: number;
  notFound: number;
  invalidRequest: number;
  sourceError: number;
  total: number;
}
