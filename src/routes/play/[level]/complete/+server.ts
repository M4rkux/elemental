import { error, json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { levels } from '$lib/server/db/schema';
import { boardFromLevel, replaySolution } from '$lib/game/solver';
import { isUnlocked, recordCompletion } from '$lib/server/progress';
import type { RequestHandler } from './$types';

const MAX_COUNT = 100_000;

/**
 * Accepts a level completion. The body carries:
 *  - `moves`: the exact moves that produced the win ({ from, to, count }[] from
 *    the engine's history) — the server replays these to prove the level was
 *    actually solved.
 *  - `count`: the player's move counter, which undo does NOT rewind. This is
 *    the score, but it's clamped up to the replayed solution length so a
 *    tampered-low number can't beat what's actually possible.
 */
export const POST: RequestHandler = async ({ params, locals, request }) => {
	const number = Number(params.level);
	if (!Number.isInteger(number) || number < 1) error(404, 'No such level');

	if (!(await isUnlocked(locals.playerId, number))) error(403, 'Level is locked');

	const body = await request.json().catch(() => null);
	const moves = body?.moves;
	if (!Array.isArray(moves)) error(400, 'Expected { moves: [...] }');

	const [row] = await db.select().from(levels).where(eq(levels.number, number)).limit(1);
	if (!row) error(404, 'No such level');

	const solutionLength = replaySolution(
		boardFromLevel(row.data),
		moves as { from: number; to: number; count: number }[]
	);
	if (solutionLength === null || solutionLength <= 0) {
		error(422, 'That solution does not solve the level');
	}

	const reported = Math.trunc(Number(body?.count));
	const steps = Math.max(
		solutionLength,
		Number.isFinite(reported) ? Math.min(Math.max(reported, 0), MAX_COUNT) : 0
	);

	const { bestSteps, previousBest } = await recordCompletion(locals.playerId, number, steps);
	return json({ steps, bestSteps, previousBest });
};
