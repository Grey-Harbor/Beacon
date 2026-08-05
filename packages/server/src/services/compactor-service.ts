import { compactorEventSchema, type RedirectResource } from '@beacon/shared';
import { canonicalizeSourceUrl } from '../domain.js';
import type { DriftPort } from '../drift.js';
import { AppError } from '../errors.js';
import type { ProjectionStore } from '../projections.js';
import { RECORD_TYPES } from '../records.js';
import type { CatalogService } from './catalog-service.js';
import type { ProjectionWriter } from './projection-writer.js';

export class CompactorService {
  constructor(
    private readonly drift: DriftPort,
    private readonly projections: ProjectionStore,
    private readonly projectionWriter: ProjectionWriter,
    private readonly catalog: CatalogService,
  ) {}

  async resolve(sourceUrl: string) {
    const canonicalUrl = canonicalizeSourceUrl(sourceUrl);
    const redirect = await this.findRedirect(canonicalUrl);
    if (!redirect || redirect.status !== 'active' || redirect.sourceUrl !== canonicalUrl) {
      return null;
    }
    return {
      id: redirect.id,
      canonical_url: redirect.sourceUrl,
      redirect_url: redirect.destination.url,
      status_code: redirect.statusCode,
      response_headers: redirect.responseHeaders,
    };
  }

  async ingestEvent(raw: unknown) {
    const event = compactorEventSchema.parse(raw);
    if (this.projections.hasEvent(event.event_id)) return;

    await this.drift.createVertex({
      type: RECORD_TYPES.event,
      externalId: event.event_id,
      slug: event.redirect_id,
      title: `${event.outcome} · ${event.request.host}${event.request.path}`,
      status: event.outcome,
      data: event,
    });
    this.projectionWriter.update(() => this.projections.addEvent(event));
  }

  private async findRedirect(canonicalUrl: string) {
    const indexedId = this.projections.findResolution(canonicalUrl);
    if (!indexedId) return this.scanAndRepair(canonicalUrl);

    try {
      return await this.catalog.getRedirect(indexedId);
    } catch (error) {
      this.projectionWriter.update(() => this.projections.deleteResource(indexedId));
      if (error instanceof AppError && error.statusCode === 404) return null;
      throw error;
    }
  }

  private async scanAndRepair(canonicalUrl: string): Promise<RedirectResource | null> {
    const match = (await this.catalog.listRedirects()).find(
      (redirect) => redirect.sourceUrl === canonicalUrl && redirect.status === 'active',
    );
    if (!match) return null;
    this.projectionWriter.update(() => this.projections.upsertRedirect(match));
    return match;
  }
}
