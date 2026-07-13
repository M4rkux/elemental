// Ordered phase list, mirroring static/phases/; will come from the backend later.
export const PHASES = [
	{ id: 'phase-1', name: 'First Steps' },
	{ id: 'phase-2', name: 'Gentle Breeze' },
	{ id: 'phase-3', name: 'Ember Path' },
	{ id: 'phase-4', name: 'River Stones' },
	{ id: 'phase-5', name: 'Rising Flames' },
	{ id: 'phase-6', name: 'Shifting Sands' },
	{ id: 'phase-7', name: 'Deep Currents' },
	{ id: 'phase-8', name: 'Wild Gale' },
	{ id: 'phase-9', name: 'Stone Circle' },
	{ id: 'phase-10', name: 'Balance of Two' }
] as const;

/** The phase that follows `id` in the campaign, if any. */
export function nextPhase(id: string): (typeof PHASES)[number] | undefined {
	const index = PHASES.findIndex((p) => p.id === id);
	return index === -1 ? undefined : PHASES[index + 1];
}
