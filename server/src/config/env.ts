import 'dotenv/config'
import { z } from 'zod'

// Validate all configuration once, at startup. A missing or weak secret must
// stop the process instead of silently falling back to a guessable default.
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('1d'),
  CLIENT_URL: z.string().url().optional(),
  // Extra allowed origins, comma-separated (e.g. your production domain)
  CORS_ORIGINS: z.string().optional(),
  // Optional regex for preview deployments, e.g. ^https://smart-expense-[a-z0-9-]+-rahul\.vercel\.app$
  CORS_PREVIEW_ORIGIN_REGEX: z.string().optional(),
  // Number of reverse proxies in front of the app (Vercel/Railway/nginx = 1)
  TRUST_PROXY: z.coerce.number().int().min(0).default(1),
  LOG_LEVEL: z.string().default('info'),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('Invalid environment configuration:')
  for (const issue of parsed.error.issues) {
    // eslint-disable-next-line no-console
    console.error(`  - ${issue.path.join('.')}: ${issue.message}`)
  }
  process.exit(1)
}

export const env = parsed.data
export const isProduction = env.NODE_ENV === 'production'
