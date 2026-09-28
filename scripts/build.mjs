// Build script for Vercel: finds the database, creates/updates tables, builds the site.
import { execSync } from 'node:child_process';

const NAMES = [
  'DATABASE_URL',
  'POSTGRES_PRISMA_URL',
  'POSTGRES_URL',
  'DATABASE_URL_UNPOOLED',
  'POSTGRES_URL_NON_POOLING',
];

function findDatabaseUrl() {
  for (const name of NAMES) {
    if (process.env[name]) return [name, process.env[name]];
  }
  // Vercel lets you add a custom prefix when connecting a database (e.g. STORAGE_DATABASE_URL).
  const prefixed = Object.keys(process.env).find(
    (k) => /_(DATABASE_URL|POSTGRES_URL|POSTGRES_PRISMA_URL)$/.test(k) && process.env[k]
  );
  return prefixed ? [prefixed, process.env[prefixed]] : [null, null];
}

const [name, url] = findDatabaseUrl();
if (!url) {
  console.error(`
==================================================================
  BFRENZ: no database connected yet.

  In your Vercel project:
    1. Open the Storage tab -> Create Database -> Neon (Postgres).
    2. Connect it to this project (tick Production and Preview).
    3. Deployments tab -> latest deployment -> ... -> Redeploy.
==================================================================
`);
  process.exit(1);
}

console.log(`BFRENZ: using database from ${name}`);
const env = { ...process.env, DATABASE_URL: url };
const run = (cmd) => execSync(cmd, { stdio: 'inherit', env });

run('npx prisma generate');
run('npx prisma db push --skip-generate');
run('npx next build');
