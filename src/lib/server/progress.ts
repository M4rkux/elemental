import { and, eq, sql } from 'drizzle-orm';
import { db } from './db';
import { playerProgress } from './db/schema';

/** Level numbers this player has completed (a row exists = done). */
export async function completedLevels(playerId: string): Promise<number[]> {
	const rows = await db
		.select({ n: playerProgress.levelNumber })
		.from(playerProgress)
		.where(eq(playerProgress.playerId, playerId));
	return rows.map((r) => r.n);
}

/** A level is playable if it's the first or the previous one is completed. */
export async function isUnlocked(playerId: string, level: number): Promise<boolean> {
	if (level <= 1) return true;
	const [row] = await db
		.select({ n: playerProgress.levelNumber })
		.from(playerProgress)
		.where(
			and(eq(playerProgress.playerId, playerId), eq(playerProgress.levelNumber, level - 1))
		)
		.limit(1);
	return row !== undefined;
}

/** Best (fewest) steps this player has solved a level in, or null if never. */
export async function bestSteps(playerId: string, level: number): Promise<number | null> {
	const [row] = await db
		.select({ best: playerProgress.bestSteps })
		.from(playerProgress)
		.where(and(eq(playerProgress.playerId, playerId), eq(playerProgress.levelNumber, level)))
		.limit(1);
	return row?.best ?? null;
}

/**
 * Records a verified completion. Keeps the lowest step count ever seen for the
 * level (`steps` must already be a real, > 0 solve count from replaySolution).
 * Returns the stored best and what it was before this run (null on first clear),
 * so the UI can say whether this run set a new record.
 */
export async function recordCompletion(
	playerId: string,
	level: number,
	steps: number
): Promise<{ bestSteps: number; previousBest: number | null }> {
	const previousBest = await bestSteps(playerId, level);
	const [row] = await db
		.insert(playerProgress)
		.values({ playerId, levelNumber: level, bestSteps: steps })
		.onConflictDoUpdate({
			target: [playerProgress.playerId, playerProgress.levelNumber],
			set: { bestSteps: sql`least(${playerProgress.bestSteps}, ${steps})` }
		})
		.returning({ best: playerProgress.bestSteps });
	return { bestSteps: row.best, previousBest };
}
