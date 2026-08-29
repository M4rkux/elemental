<script lang="ts">
	import GameBoard from '$lib/components/GameBoard.svelte';
	import type { GameEngine } from '$lib/game/engine.svelte';

	let { data } = $props();

	// Bumping the key remounts the board, giving the engine a fresh copy of the
	// level; the level number keys navigation between levels.
	let attempt = $state(0);
	// The result of a win this session, tagged with its level so it's ignored
	// once the player navigates on. Drives the best/record line in the overlay.
	let session = $state<{
		level: number;
		steps: number;
		bestSteps: number;
		previousBest: number | null;
	} | null>(null);

	// Per-player best for this level, from the DB (page load), then updated in
	// place after a win.
	let best = $derived(
		session && session.level === data.level.number ? session.bestSteps : data.best,
	);

	// How the just-finished run compares to the player's history on this level.
	type Outcome = 'first' | 'record' | 'tied' | 'worse';
	let winOutcome = $derived.by((): Outcome | null => {
		if (!session || session.level !== data.level.number) return null;
		const { steps, previousBest } = session;
		if (previousBest === null) return 'first';
		if (steps < previousBest) return 'record';
		if (steps === previousBest) return 'tied';
		return 'worse';
	});

	// The server replays `moves` to prove the level was really solved, then
	// unlocks the next one. `count` is the player's move counter (undo doesn't
	// rewind it) — the score. Runs silently in the background with a few
	// retries; the player is never shown a saving/error state.
	async function reportWin(
		solution: GameEngine['solution'],
		count: number,
		retriesLeft = 3,
	): Promise<void> {
		const level = data.level.number;
		try {
			const res = await fetch(`/play/${level}/complete`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ moves: solution, count }),
				signal: AbortSignal.timeout(10_000),
			});
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const body = (await res.json()) as {
				steps: number;
				bestSteps: number;
				previousBest: number | null;
			};
			session = { level, ...body };
		} catch {
			if (retriesLeft > 0) {
				await new Promise((r) => setTimeout(r, 800 * (4 - retriesLeft)));
				return reportWin(solution, count, retriesLeft - 1);
			}
		}
	}
</script>

<svelte:head>
	<title>Elemental — {data.level.name}</title>
</svelte:head>

{#key `${data.level.number}:${attempt}`}
	<GameBoard
		level={data.level}
		nextHref={data.nextNumber ? `/play/${data.nextNumber}` : undefined}
		{best}
		{winOutcome}
		onwin={reportWin}
		onrestart={() => attempt++}
	/>
{/key}
