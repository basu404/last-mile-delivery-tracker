import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(1),
  JWT_EXPIRES_IN: z.string().default('7d'),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
});

const parsedEnv = envSchema.parse(process.env);

function normalizeDatabaseUrl(value: string): string {
  const url = new URL(value);

  if (url.hostname.endsWith('.neon.tech')) {
    const hostnameParts = url.hostname.split('.');
    if (hostnameParts[0].startsWith('ep-') && !hostnameParts[0].endsWith('-pooler')) {
      hostnameParts[0] = `${hostnameParts[0]}-pooler`;
      url.hostname = hostnameParts.join('.');
    }
    url.searchParams.set('sslmode', 'require');
    url.searchParams.set('connect_timeout', '15');
    url.searchParams.set('pool_timeout', '15');
    url.searchParams.set('connection_limit', '5');
  }

  return url.toString();
}

const databaseUrl = normalizeDatabaseUrl(parsedEnv.DATABASE_URL);
process.env.DATABASE_URL = databaseUrl;

export const env = { ...parsedEnv, DATABASE_URL: databaseUrl };

const globalForPrisma = globalThis as unknown as { prismaBase?: PrismaClient };
const prismaBase = globalForPrisma.prismaBase ?? new PrismaClient();
let reconnectPromise: Promise<void> | null = null;

function wait(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export function isDatabaseUnavailableError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { code?: string; errorCode?: string; message?: string };
  return (
    candidate.code === 'P1001' ||
    candidate.errorCode === 'P1001' ||
    candidate.message?.includes("Can't reach database server") === true
  );
}

async function connectBaseWithRetry(maxAttempts: number) {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await prismaBase.$connect();
      return;
    } catch (error) {
      lastError = error;
      if (!isDatabaseUnavailableError(error) || attempt === maxAttempts) throw error;
      await wait(500 * 2 ** (attempt - 1));
    }
  }

  throw lastError;
}

async function reconnectDatabase() {
  if (!reconnectPromise) {
    reconnectPromise = (async () => {
      try {
        await prismaBase.$disconnect();
      } catch {
        // The old pool may already be disconnected.
      }
      await connectBaseWithRetry(4);
    })().finally(() => {
      reconnectPromise = null;
    });
  }

  return reconnectPromise;
}

export const prisma = prismaBase.$extends({
  name: 'neon-p1001-recovery',
  query: {
    $allModels: {
      async $allOperations({ args, query }) {
        try {
          return await query(args);
        } catch (error) {
          if (!isDatabaseUnavailableError(error)) throw error;
          await reconnectDatabase();
          return query(args);
        }
      },
    },
  },
});

export function connectDatabaseWithRetry(maxAttempts = 5) {
  return connectBaseWithRetry(maxAttempts);
}

export async function checkDatabaseConnection() {
  try {
    await prismaBase.$queryRaw`SELECT 1`;
  } catch (error) {
    if (!isDatabaseUnavailableError(error)) throw error;
    await reconnectDatabase();
    await prismaBase.$queryRaw`SELECT 1`;
  }
}

export function disconnectDatabase() {
  return prismaBase.$disconnect();
}

if (env.NODE_ENV !== 'production') {
  globalForPrisma.prismaBase = prismaBase;
}
