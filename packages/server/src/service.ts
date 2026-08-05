import type { DestinationInput, RedirectInput } from '@beacon/shared';
import type { DriftPort } from './drift.js';
import type { ProjectionStore } from './projections.js';
import { AdminService } from './services/admin-service.js';
import { CatalogService } from './services/catalog-service.js';
import { CompactorService } from './services/compactor-service.js';
import { ProjectionWriter } from './services/projection-writer.js';
import { RebuildService } from './services/rebuild-service.js';

/**
 * Stable application facade used by HTTP routes.
 *
 * Workflow behavior lives in focused collaborators; this class deliberately
 * contains no domain logic so transport code has one small dependency.
 */
export class BeaconService {
  private readonly admin: AdminService;
  private readonly catalog: CatalogService;
  private readonly compactor: CompactorService;
  private readonly rebuilder: RebuildService;

  constructor(drift: DriftPort, projections: ProjectionStore) {
    const projectionWriter = new ProjectionWriter(drift, projections);
    this.admin = new AdminService(drift);
    this.catalog = new CatalogService(drift, projections, projectionWriter);
    this.compactor = new CompactorService(drift, projections, projectionWriter, this.catalog);
    this.rebuilder = new RebuildService(drift, projections);
  }

  setupStatus() {
    return this.admin.setupStatus();
  }

  setup(username: string, password: string) {
    return this.admin.setup(username, password);
  }

  authenticate(username: string, password: string) {
    return this.admin.authenticate(username, password);
  }

  listDestinations() {
    return this.catalog.listDestinations();
  }

  createDestination(input: DestinationInput, actor = 'admin') {
    return this.catalog.createDestination(input, actor);
  }

  updateDestination(id: string, input: DestinationInput, actor = 'admin') {
    return this.catalog.updateDestination(id, input, actor);
  }

  archiveDestination(id: string, version: number, actor = 'admin') {
    return this.catalog.archiveDestination(id, version, actor);
  }

  listRedirects() {
    return this.catalog.listRedirects();
  }

  getRedirect(id: string) {
    return this.catalog.getRedirect(id);
  }

  createRedirect(input: RedirectInput, actor = 'admin') {
    return this.catalog.createRedirect(input, actor);
  }

  updateRedirect(id: string, input: RedirectInput, actor = 'admin') {
    return this.catalog.updateRedirect(id, input, actor);
  }

  archiveRedirect(id: string, version: number, actor = 'admin') {
    return this.catalog.archiveRedirect(id, version, actor);
  }

  resolve(canonicalUrl: string) {
    return this.compactor.resolve(canonicalUrl);
  }

  ingestEvent(raw: unknown) {
    return this.compactor.ingestEvent(raw);
  }

  rebuild() {
    return this.rebuilder.rebuild();
  }
}
