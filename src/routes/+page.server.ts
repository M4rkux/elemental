import { asc } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { levels } from '$lib/server/db/schema';
import { completedLevels } from '$lib/server/progress';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const [rows, completed] = await Promise.all([
		db.select({ number: levels.number }).from(levels).orderBy(asc(levels.number)),
		completedLevels(locals.playerId)
	]);
	return { levelNumbers: rows.map((r) => r.number), completed };
};
