import { env } from '$env/dynamic/private';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

// postgres-js works both locally (docker-compose) and against Neon. If Vercel
// connection counts become a problem, swap to drizzle-orm/neon-http.
const client = postgres(env.DATABASE_URL);

export const db = drizzle(client, { schema });
