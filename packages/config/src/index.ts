import { z } from 'zod';

const boolFromEnv = z
  .union([z.boolean(), z.string()])
  .transform((v) => (typeof v === 'boolean' ? v : v === 'true' || v === '1'))
  .default(false);

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  WEB_URL: z.string().url().default('http://localhost:3000'),
  API_URL: z.string().url().default('http://localhost:4000'),
  API_PORT: z.coerce.number().int().positive().default(4000),
  AI_SERVICE_URL: z.string().url().default('http://localhost:4100'),
  AI_SERVICE_PORT: z.coerce.number().int().positive().default(4100),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1).default('redis://localhost:6379'),
  TEMPORAL_ADDRESS: z.string().default('localhost:7233'),
  TEMPORAL_NAMESPACE: z.string().default('default'),
  ORCHESTRATOR_TASK_QUEUE: z.string().default('inspectra-scans'),
  AUTH_SECRET: z.string().min(8).optional(),
  AI_DEFAULT_PROVIDER: z.string().default('stub'),
  FEATURE_AI_TRIAGE: boolFromEnv,
  FEATURE_SAAS_AUDITS: boolFromEnv,
});

export type InspectraEnv = z.infer<typeof envSchema>;

/** Parse and validate environment variables. Throws on invalid config. */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): InspectraEnv {
  return envSchema.parse(source);
}
