import { randomUUID } from 'node:crypto';
import type { ActivityRecord } from '@beacon/shared';
import type { DriftPort } from '../drift.js';
import type { ProjectionStore } from '../projections.js';
import { RECORD_TYPES } from '../records.js';

interface ActivityResource {
  id: string;
  title: string;
  version: number;
  updatedAt: string;
}

export class ProjectionWriter {
  constructor(
    private readonly drift: DriftPort,
    private readonly projections: ProjectionStore,
  ) {}

  update(operation: () => void) {
    try {
      operation();
    } catch {
      this.markStale();
    }
  }

  markStale() {
    this.projections.setStatus('stale');
  }

  async recordActivity(
    action: string,
    resourceType: 'redirect' | 'destination',
    resource: ActivityResource,
    actor: string,
  ) {
    const activity: ActivityRecord = {
      id: randomUUID(),
      action,
      resourceType,
      resourceId: resource.id,
      resourceTitle: resource.title,
      actor,
      occurredAt: new Date().toISOString(),
    };
    try {
      await this.drift.createVertex({
        type: RECORD_TYPES.activity,
        externalId: activity.id,
        title: `${action} ${resource.title}`,
        status: 'recorded',
        data: { ...activity, afterVersion: resource.version },
      });
      this.update(() => this.projections.addActivity(activity));
    } catch {
      this.markStale();
    }
  }
}
