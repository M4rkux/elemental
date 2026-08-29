import { integer, jsonb, pgTable, primaryKey, serial, text, timestamp } from 'drizzle-orm/pg-core';
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

/**
 * Per-player campaign progress. A row exists only for a level the player has
 * completed with a server-verified solution — presence unlocks the next level.
 * Keyed by the anonymous id from the `eid` cookie (see hooks.server.ts).
 */
export const playerProgress = pgTable(
	'player_progress',
	{
		playerId: text('player_id').notNull(),
		levelNumber: integer('level_number').notNull(),
		/** Fewest moves the player has ever solved it in (always > 0). */
		bestSteps: integer('best_steps').notNull(),
		completedAt: timestamp('completed_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [primaryKey({ columns: [t.playerId, t.levelNumber] })]
);
