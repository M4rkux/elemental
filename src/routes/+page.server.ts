import { asc } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { levels } from '$lib/server/db/schema';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	// The menu only needs the ordered level numbers to pick the next one to play.
	const rows = await db.select({ number: levels.number }).from(levels).orderBy(asc(levels.number));
	return { levelNumbers: rows.map((r) => r.number) };
};
