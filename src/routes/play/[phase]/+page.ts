import { error } from '@sveltejs/kit';
import type { PhaseData } from '$lib/game/types';
import type { PageLoad } from './$types';

// Phases are static JSON for now; the same shape will come from the backend later.
export const load: PageLoad = async ({ fetch, params }) => {
	const res = await fetch(`/phases/${params.phase}.json`);
	if (!res.ok) error(404, `Phase "${params.phase}" not found`);
	const phase: PhaseData = await res.json();
	return { phase };
};
