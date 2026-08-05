import { compactorEventSchema } from '@beacon/shared';
import type { DriftPort } from '../drift.js';
import type { ProjectionStore } from '../projections.js';
import {
  RECORD_TYPES,
  activityFromVertex,
  destinationFromVertex,
  redirectFromVertices,
} from '../records.js';

export class RebuildService {
  constructor(
    private readonly drift: DriftPort,
    private readonly projections: ProjectionStore,
  ) {}

  async rebuild() {
    const [redirects, destinations, edges, activities, events] = await Promise.all([
      this.drift.listVertices(RECORD_TYPES.redirect),
      this.drift.listVertices(RECORD_TYPES.destination),
      this.drift.listEdges({ type: 'points_to' }),
      this.drift.listVertices(RECORD_TYPES.activity),
      this.drift.listVertices(RECORD_TYPES.event),
    ]);
    const destinationsById = new Map(destinations.map((item) => [item.id, item]));
    const edgesByRedirect = new Map(edges.map((edge) => [edge.fromVertexId, edge]));

    const mappedRedirects = redirects.flatMap((redirect) => {
      const edge = edgesByRedirect.get(redirect.id);
      const destination = edge && destinationsById.get(edge.toVertexId);
      return destination ? [redirectFromVertices(redirect, destination)] : [];
    });
    const mappedEvents = events.flatMap((vertex) => {
      const parsed = compactorEventSchema.safeParse(vertex.data);
      return parsed.success ? [parsed.data] : [];
    });

    this.projections.replaceAll({
      redirects: mappedRedirects,
      destinations: destinations.map((vertex) => destinationFromVertex(vertex)),
      activities: activities.map(activityFromVertex),
      events: mappedEvents,
    });
    return {
      redirects: mappedRedirects.length,
      destinations: destinations.length,
      events: mappedEvents.length,
    };
  }
}
