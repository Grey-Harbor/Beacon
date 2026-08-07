import { z } from 'zod';

const schema = z.object({
  BEACON_HOST: z.string().default('0.0.0.0'),
  BEACON_PORT: z.coerce.number().int().min(1).max(65535).default(3100),
  BEACON_DATA_PATH: z.string().default('./data/beacon-index.sqlite'),
  BEACON_SESSION_SECRET: z.string().min(32),
  BEACON_SETUP_TOKEN: z.string().min(16),
  BEACON_SOURCE_TOKEN: z.string().min(16),
  BEACON_EVENT_TOKEN: z.string().min(16),
  BEACON_BROWSER_ORIGIN: z
    .url()
    .refine(
      (value) => {
        const origin = new URL(value);
        return (
          ['http:', 'https:'].includes(origin.protocol) &&
          origin.pathname === '/' &&
          !origin.search &&
          !origin.hash &&
          !origin.username &&
          !origin.password
        );
      },
      {
        message:
          'BEACON_BROWSER_ORIGIN must be an HTTP(S) origin without a path, query, fragment, or credentials',
      },
    )
    .optional(),
  DRIFT_URL: z.url(),
  DRIFT_API_KEY: z.string().min(1),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('production'),
});

export type Config = z.infer<typeof schema>;

export function loadConfig(environment: NodeJS.ProcessEnv = process.env): Config {
  return schema.parse(environment);
}
