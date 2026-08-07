import { access } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import Fastify, { type FastifyRequest } from 'fastify';
import { z, ZodError } from 'zod';
import { bearerMatches, SessionCodec } from './auth.js';
import type { Config } from './config.js';
import { AppError } from './errors.js';
import type { ProjectionStore } from './projections.js';
import type { BeaconService } from './service.js';

declare module 'fastify' {
  interface FastifyRequest {
    admin: { username: string } | null;
  }
}

export async function createApp(
  config: Config,
  service: BeaconService,
  projections: ProjectionStore,
) {
  const app = Fastify({ logger: true, bodyLimit: 256 * 1024 });
  const sessions = new SessionCodec(config.BEACON_SESSION_SECRET);
  await app.register(cookie);
  await app.register(rateLimit, { global: true, max: 180, timeWindow: '1 minute' });

  app.decorateRequest('admin', null);
  app.addHook('onRequest', async (request) => {
    request.admin = sessions.verify(request.cookies.beacon_session);
    if (
      request.url.startsWith('/api/') &&
      !['GET', 'HEAD', 'OPTIONS'].includes(request.method) &&
      request.headers.origin
    ) {
      let originHost = '';
      let origin = '';
      try {
        const parsedOrigin = new URL(request.headers.origin);
        originHost = parsedOrigin.host;
        origin = parsedOrigin.origin;
      } catch {
        // Rejected below.
      }
      const allowedOrigin = config.BEACON_BROWSER_ORIGIN
        ? new URL(config.BEACON_BROWSER_ORIGIN).origin
        : null;
      if (allowedOrigin ? origin !== allowedOrigin : originHost !== request.headers.host) {
        throw new AppError(403, 'invalid_origin', 'Request origin is not allowed');
      }
    }
  });

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ZodError) {
      return reply.status(400).send({
        error: {
          code: 'validation_error',
          message: 'Request validation failed',
          details: error.issues,
        },
      });
    }
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        error: {
          code: error.code,
          message: error.message,
          ...(error.details ? { details: error.details } : {}),
        },
      });
    }
    app.log.error(error);
    return reply
      .status(500)
      .send({ error: { code: 'internal_error', message: 'Unexpected error' } });
  });

  const requireAdmin = (request: FastifyRequest) => {
    if (!request.admin) throw new AppError(401, 'authentication_required', 'Sign in to continue');
    return request.admin;
  };

  app.get('/health', async () => ({ status: 'ok' }));
  app.get('/api/v1/setup/status', async () => service.setupStatus());
  app.post(
    '/api/v1/setup',
    { config: { rateLimit: { max: 5, timeWindow: '15 minutes' } } },
    async (request) => {
      const body = z
        .object({ setupToken: z.string(), username: z.string(), password: z.string() })
        .strict()
        .parse(request.body);
      if (!bearerMatches(`Bearer ${body.setupToken}`, config.BEACON_SETUP_TOKEN)) {
        throw new AppError(403, 'invalid_setup_token', 'Setup token is invalid');
      }
      return service.setup(body.username, body.password);
    },
  );
  app.post(
    '/api/v1/session',
    { config: { rateLimit: { max: 8, timeWindow: '15 minutes' } } },
    async (request, reply) => {
      const body = z
        .object({ username: z.string(), password: z.string() })
        .strict()
        .parse(request.body);
      const admin = await service.authenticate(body.username, body.password);
      if (!admin) throw new AppError(401, 'invalid_login', 'Username or password is incorrect');
      reply.setCookie('beacon_session', sessions.create(admin.username), {
        path: '/',
        httpOnly: true,
        sameSite: 'strict',
        secure: config.NODE_ENV === 'production',
        maxAge: 12 * 60 * 60,
      });
      return admin;
    },
  );
  app.get('/api/v1/session', async (request) => ({
    authenticated: Boolean(request.admin),
    user: request.admin,
  }));
  app.delete('/api/v1/session', async (_request, reply) => {
    reply.clearCookie('beacon_session', { path: '/' });
    return { ok: true };
  });

  app.get('/api/v1/redirects', async (request) => {
    requireAdmin(request);
    return service.listRedirects();
  });
  app.get('/api/v1/redirects/:id', async (request) => {
    requireAdmin(request);
    const { id } = z.object({ id: z.string() }).parse(request.params);
    return service.getRedirect(id);
  });
  app.post('/api/v1/redirects', async (request) => {
    const admin = requireAdmin(request);
    return service.createRedirect(request.body as never, admin.username);
  });
  app.patch('/api/v1/redirects/:id', async (request) => {
    const admin = requireAdmin(request);
    const { id } = z.object({ id: z.string() }).parse(request.params);
    return service.updateRedirect(id, request.body as never, admin.username);
  });
  app.delete('/api/v1/redirects/:id', async (request) => {
    const admin = requireAdmin(request);
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const { version } = z.object({ version: z.number().int().positive() }).parse(request.body);
    return service.archiveRedirect(id, version, admin.username);
  });

  app.get('/api/v1/destinations', async (request) => {
    requireAdmin(request);
    return service.listDestinations();
  });
  app.post('/api/v1/destinations', async (request) => {
    const admin = requireAdmin(request);
    return service.createDestination(request.body as never, admin.username);
  });
  app.patch('/api/v1/destinations/:id', async (request) => {
    const admin = requireAdmin(request);
    const { id } = z.object({ id: z.string() }).parse(request.params);
    return service.updateDestination(id, request.body as never, admin.username);
  });
  app.delete('/api/v1/destinations/:id', async (request) => {
    const admin = requireAdmin(request);
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const { version } = z.object({ version: z.number().int().positive() }).parse(request.body);
    return service.archiveDestination(id, version, admin.username);
  });

  app.get('/api/v1/search', async (request) => {
    requireAdmin(request);
    const { q } = z.object({ q: z.string().default('') }).parse(request.query);
    return projections.search(q);
  });
  app.get('/api/v1/activity', async (request) => {
    requireAdmin(request);
    return projections.recentActivity(10);
  });
  app.get('/api/v1/events', async (request) => {
    requireAdmin(request);
    const query = z
      .object({
        redirectId: z.string().optional(),
        outcome: z.string().optional(),
        since: z.string().optional(),
      })
      .parse(request.query);
    return projections.events(query);
  });
  app.get('/api/v1/reports/redirects', async (request) => {
    requireAdmin(request);
    const { since } = z.object({ since: z.string().optional() }).parse(request.query);
    return projections.report(since);
  });
  app.get('/api/v1/projections', async (request) => {
    requireAdmin(request);
    return projections.status();
  });
  app.post('/api/v1/projections/rebuild', async (request) => {
    requireAdmin(request);
    return service.rebuild();
  });

  app.get('/integrations/compactor/v1/resolve', async (request, reply) => {
    if (!bearerMatches(request.headers.authorization, config.BEACON_SOURCE_TOKEN)) {
      throw new AppError(401, 'invalid_source_token', 'Invalid source credential');
    }
    const query = z.object({ url: z.string() }).strict().parse(request.query);
    const resolved = await service.resolve(query.url);
    if (!resolved) return reply.status(404).send();
    return resolved;
  });
  app.post('/integrations/compactor/v1/events', async (request, reply) => {
    if (!bearerMatches(request.headers.authorization, config.BEACON_EVENT_TOKEN)) {
      throw new AppError(401, 'invalid_event_token', 'Invalid event credential');
    }
    await service.ingestEvent(request.body);
    return reply.status(204).send();
  });

  const webRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../apps/web/out');
  try {
    await access(webRoot);
    await app.register(fastifyStatic, { root: webRoot, wildcard: false });
    app.setNotFoundHandler((request, reply) => {
      if (request.url.startsWith('/api/') || request.url.startsWith('/integrations/')) {
        return reply.status(404).send({ error: { code: 'not_found', message: 'Route not found' } });
      }
      return reply.sendFile('index.html');
    });
  } catch {
    // API-only development mode; Next.js serves the UI separately.
  }

  return app;
}
