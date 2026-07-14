/**
 * Seeds the levels table from db/seeds/levels/*.json, upserting by level
 * number so reruns are safe.
 *
 *   bun scripts/seed.ts
 */
import { readdirSync } from 'fs';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import type { LevelData } from '../src/lib/game/types';
import { levels } from '../src/lib/server/db/schema';

const url = process.env.DATABASE_URL ?? 'postgres://elemental:elemental@localhost:5433/elemental';
const client = postgres(url, { max: 1 });
const db = drizzle(client);

const files = readdirSync('db/seeds/levels')
	.filter((f) => f.endsWith('.json'))
	.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

for (const file of files) {
	const level: LevelData = await Bun.file(`db/seeds/levels/${file}`).json();
	await db
		.insert(levels)
		.values({ number: level.number, stage: level.stage, name: level.name, data: level.data })
		.onConflictDoUpdate({
			target: levels.number,
			set: { stage: level.stage, name: level.name, data: level.data }
		});
	console.log(`✓ level ${level.number} (${level.name})`);
}

await client.end();
console.log(`\nSeeded ${files.length} levels`);
