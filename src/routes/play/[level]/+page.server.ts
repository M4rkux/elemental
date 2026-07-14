import { error } from '@sveltejs/kit';
import { inArray } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { levels } from '$lib/server/db/schema';
import type { LevelData } from '$lib/game/types';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const number = Number(params.level);
	if (!Number.isInteger(number) || number < 1) error(404, `Level "${params.level}" not found`);

	// One query fetches the level and tells whether a next one exists.
	const rows = await db
		.select()
		.from(levels)
		.where(inArray(levels.number, [number, number + 1]));

	const row = rows.find((r) => r.number === number);
	if (!row) error(404, `Level "${params.level}" not found`);

	const level: LevelData = { number: row.number, stage: row.stage, name: row.name, data: row.data };
	const nextNumber = rows.some((r) => r.number === number + 1) ? number + 1 : undefined;
	return { level, nextNumber };
};
