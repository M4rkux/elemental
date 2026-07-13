<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import GameBoard from '$lib/components/GameBoard.svelte';
	import { nextPhase } from '$lib/game/phases';
	import { progress } from '$lib/game/progress.svelte';

	let { data } = $props();

	// Bumping the key remounts the board, giving the engine a fresh copy of the
	// phase; the phase id keys navigation between levels.
	let attempt = $state(0);

	let next = $derived(nextPhase(data.phase.id));

	// Locked phases can't be reached, not even by typing the URL. localStorage
	// only exists in the browser, so the check runs client-side.
	let allowed = $derived(browser && progress.isUnlocked(data.phase.id));

	$effect(() => {
		if (!progress.isUnlocked(data.phase.id)) {
			goto('/', { replaceState: true });
		}
	});
</script>

<svelte:head>
	<title>Elemental — {data.phase.name}</title>
</svelte:head>

{#if allowed}
	{#key `${data.phase.id}:${attempt}`}
		<GameBoard
			phase={data.phase}
			nextHref={next ? `/play/${next.id}` : undefined}
			onwin={() => progress.complete(data.phase.id)}
			onrestart={() => attempt++}
		/>
	{/key}
{/if}
