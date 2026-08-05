import {
  destinationInputSchema,
  redirectInputSchema,
  type DestinationInput,
  type DestinationResource,
  type RedirectInput,
} from '@beacon/shared';
import {
  canonicalizeSourceUrl,
  validateDestinationUrl,
  validateResponseHeaders,
} from '../domain.js';
import type { DriftPort } from '../drift.js';
import { AppError } from '../errors.js';
import type { ProjectionStore } from '../projections.js';
import { RECORD_TYPES, destinationFromVertex, redirectFromVertices } from '../records.js';
import type { ProjectionWriter } from './projection-writer.js';

export class CatalogService {
  constructor(
    private readonly drift: DriftPort,
    private readonly projections: ProjectionStore,
    private readonly projectionWriter: ProjectionWriter,
  ) {}

  async listDestinations() {
    const [vertices, edges] = await Promise.all([
      this.drift.listVertices(RECORD_TYPES.destination),
      this.drift.listEdges({ type: 'points_to' }),
    ]);
    const redirectCounts = new Map<string, number>();
    for (const edge of edges) {
      redirectCounts.set(edge.toVertexId, (redirectCounts.get(edge.toVertexId) ?? 0) + 1);
    }
    return vertices.map((vertex) =>
      destinationFromVertex(vertex, redirectCounts.get(vertex.id) ?? 0),
    );
  }

  async createDestination(raw: DestinationInput, actor = 'admin') {
    const input = destinationInputSchema.parse(raw);
    const vertex = await this.drift.createVertex({
      type: RECORD_TYPES.destination,
      title: input.title,
      status: 'active',
      data: { url: validateDestinationUrl(input.url) },
    });
    const destination = destinationFromVertex(vertex, 0);
    this.projectionWriter.update(() => this.projections.upsertDestination(destination));
    await this.projectionWriter.recordActivity('created', 'destination', destination, actor);
    return destination;
  }

  async updateDestination(id: string, raw: DestinationInput, actor = 'admin') {
    const input = destinationInputSchema.parse(raw);
    if (!input.version) {
      throw new AppError(400, 'version_required', 'Current version is required');
    }
    const vertex = await this.drift.patchVertex(id, {
      version: input.version,
      title: input.title,
      data: { url: validateDestinationUrl(input.url) },
    });
    const edges = await this.drift.listEdges({ type: 'points_to', toVertexId: id });
    const destination = destinationFromVertex(vertex, edges.length);
    this.projectionWriter.update(() => this.projections.upsertDestination(destination));
    await this.projectionWriter.recordActivity('edited', 'destination', destination, actor);
    return destination;
  }

  async archiveDestination(id: string, version: number, actor = 'admin') {
    const references = await this.drift.listEdges({ type: 'points_to', toVertexId: id });
    if (references.length) {
      throw new AppError(
        409,
        'destination_in_use',
        'Reassign, disable, or archive referencing redirects first',
        { redirectCount: references.length },
      );
    }
    const current = await this.drift.getVertex(id);
    await this.drift.deleteVertex(id, version);
    this.projectionWriter.update(() => this.projections.deleteResource(id));
    await this.projectionWriter.recordActivity(
      'archived',
      'destination',
      {
        id,
        title: current.title ?? 'Untitled destination',
        version,
        updatedAt: current.updatedAt,
      },
      actor,
    );
    return { ok: true };
  }

  async listRedirects() {
    const [redirects, destinations, edges] = await Promise.all([
      this.drift.listVertices(RECORD_TYPES.redirect),
      this.drift.listVertices(RECORD_TYPES.destination),
      this.drift.listEdges({ type: 'points_to' }),
    ]);
    const destinationById = new Map(
      destinations.map((destination) => [destination.id, destination]),
    );
    const edgeByRedirect = new Map(edges.map((edge) => [edge.fromVertexId, edge]));

    return redirects.map((redirect) => {
      const edge = edgeByRedirect.get(redirect.id);
      const destination = edge && destinationById.get(edge.toVertexId);
      if (!destination) {
        throw new AppError(502, 'invalid_graph', 'Redirect has no destination');
      }
      return redirectFromVertices(redirect, destination);
    });
  }

  async getRedirect(id: string) {
    const [redirect, outgoing] = await Promise.all([
      this.drift.getVertex(id),
      this.drift.getOutgoing(id, 'points_to'),
    ]);
    if (outgoing.edges.length !== 1 || outgoing.vertices.length !== 1) {
      throw new AppError(502, 'invalid_graph', 'Redirect must point to exactly one destination');
    }
    return redirectFromVertices(redirect, outgoing.vertices[0]!);
  }

  async createRedirect(raw: RedirectInput, actor = 'admin') {
    const input = redirectInputSchema.parse(raw);
    requireDestination(input);
    const sourceUrl = canonicalizeSourceUrl(input.sourceUrl);
    validateResponseHeaders(input.responseHeaders);
    await this.requireUniqueRedirect(input.slug, sourceUrl);

    const destination = await this.resolveDestination(input, actor);
    const vertex = await this.drift.createVertex({
      type: RECORD_TYPES.redirect,
      slug: input.slug,
      title: input.title,
      status: input.status,
      data: redirectData(input, sourceUrl),
    });
    await this.drift.createEdge({
      fromVertexId: vertex.id,
      toVertexId: destination.id,
      type: 'points_to',
      status: 'active',
    });

    const redirect = redirectFromVertices(vertex, await this.drift.getVertex(destination.id));
    this.projectionWriter.update(() => this.projections.upsertRedirect(redirect));
    await this.projectionWriter.recordActivity('created', 'redirect', redirect, actor);
    return redirect;
  }

  async updateRedirect(id: string, raw: RedirectInput, actor = 'admin') {
    const input = redirectInputSchema.parse(raw);
    if (!input.version) {
      throw new AppError(400, 'version_required', 'Current version is required');
    }
    requireDestination(input);
    const sourceUrl = canonicalizeSourceUrl(input.sourceUrl);
    validateResponseHeaders(input.responseHeaders);
    await this.requireUniqueRedirect(input.slug, sourceUrl, id);

    const outgoing = await this.drift.getOutgoing(id, 'points_to');
    if (outgoing.edges.length !== 1) {
      throw new AppError(502, 'invalid_graph', 'Redirect edge is invalid');
    }
    const destination = await this.resolveDestination(input, actor);
    const vertex = await this.drift.patchVertex(id, {
      version: input.version,
      slug: input.slug,
      title: input.title,
      status: input.status,
      data: redirectData(input, sourceUrl),
    });
    await this.replaceDestinationEdge(id, outgoing.edges[0]!, destination.id);

    const redirect = redirectFromVertices(vertex, await this.drift.getVertex(destination.id));
    this.projectionWriter.update(() => this.projections.upsertRedirect(redirect));
    await this.projectionWriter.recordActivity(
      input.status === 'disabled' ? 'disabled' : 'edited',
      'redirect',
      redirect,
      actor,
    );
    return redirect;
  }

  async archiveRedirect(id: string, version: number, actor = 'admin') {
    const current = await this.getRedirect(id);
    await this.drift.deleteVertex(id, version);
    this.projectionWriter.update(() => this.projections.deleteResource(id));
    await this.projectionWriter.recordActivity('archived', 'redirect', current, actor);
    return { ok: true };
  }

  private async resolveDestination(
    input: RedirectInput,
    actor: string,
  ): Promise<DestinationResource> {
    if (input.destinationId) {
      return destinationFromVertex(await this.drift.getVertex(input.destinationId));
    }
    return this.createDestination(input.destination!, actor);
  }

  private async requireUniqueRedirect(slug: string, sourceUrl: string, excludingId?: string) {
    const conflict = (await this.listRedirects()).find(
      (redirect) =>
        redirect.id !== excludingId &&
        (redirect.slug.toLowerCase() === slug.toLowerCase() || redirect.sourceUrl === sourceUrl),
    );
    if (conflict) {
      throw new AppError(409, 'redirect_conflict', 'Redirect slug and source URL must be unique');
    }
  }

  private async replaceDestinationEdge(
    redirectId: string,
    current: { id: string; toVertexId: string; version: number },
    destinationId: string,
  ) {
    if (current.toVertexId === destinationId) return;
    await this.drift.deleteEdge(current.id, current.version);
    await this.drift.createEdge({
      fromVertexId: redirectId,
      toVertexId: destinationId,
      type: 'points_to',
      status: 'active',
    });
  }
}

function requireDestination(input: RedirectInput) {
  if (!input.destinationId && !input.destination) {
    throw new AppError(400, 'destination_required', 'Choose or create a destination');
  }
}

function redirectData(input: RedirectInput, canonicalUrl: string) {
  return {
    canonicalUrl,
    statusCode: input.statusCode,
    responseHeaders: input.responseHeaders,
  };
}
