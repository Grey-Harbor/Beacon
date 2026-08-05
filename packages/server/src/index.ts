import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { DriftGateway } from './drift.js';
import { ProjectionStore } from './projections.js';
import { BeaconService } from './service.js';

const config = loadConfig();
const projections = new ProjectionStore(config.BEACON_DATA_PATH);
const drift = new DriftGateway(config.DRIFT_URL, config.DRIFT_API_KEY);
const service = new BeaconService(drift, projections);
const app = await createApp(config, service, projections);

try {
  await service.rebuild();
} catch (error) {
  projections.setStatus('stale');
  app.log.warn({ error }, 'Projection rebuild deferred because Drift is unavailable');
}

await app.listen({ host: config.BEACON_HOST, port: config.BEACON_PORT });

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, async () => {
    await app.close();
    projections.close();
    process.exit(0);
  });
}
