import { integer, jsonb, pgTable, serial, text } from 'drizzle-orm/pg-core';
// Relative import: this file is also loaded by drizzle-kit and bun scripts,
// which don't resolve the $lib alias.
import type { LevelGameData } from '../../game/types';

export const levels = pgTable('levels', {
	id: serial('id').primaryKey(),
	/** Unique campaign position, 1..∞. */
	number: integer('number').notNull().unique(),
	/** Stage grouping: stage 1 holds levels 1–10, and so on. */
	stage: integer('stage').notNull(),
	name: text('name').notNull(),
	/** The playable board: { maxPerPlatform, platforms }. */
	data: jsonb('data').$type<LevelGameData>().notNull()
});
