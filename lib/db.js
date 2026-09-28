import { PrismaClient } from '@prisma/client';

// Accept whatever name Vercel gave the database connection string.
function databaseUrl() {
  const named =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL_UNPOOLED ||
    process.env.POSTGRES_URL_NON_POOLING;
  if (named) return named;
  const key = Object.keys(process.env).find(
    (k) => /_(DATABASE_URL|POSTGRES_URL|POSTGRES_PRISMA_URL)$/.test(k) && process.env[k]
  );
  return key ? process.env[key] : undefined;
}

const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.__bfrenzPrisma || new PrismaClient({ datasourceUrl: databaseUrl() });

if (process.env.NODE_ENV !== 'production') globalForPrisma.__bfrenzPrisma = prisma;
