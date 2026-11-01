import { defineConfig } from 'drizzle-kit';

// drizzle-kit doesn't read .env.local on its own (Expo and Trigger.dev do).
try {
  process.loadEnvFile('.env.local');
} catch {
  // Fine in CI, where DATABASE_URL comes from the environment.
}

export default defineConfig({
  schema: './src/server/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL ?? '' },
});
