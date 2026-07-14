<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import GameBoard from '$lib/components/GameBoard.svelte';
	import { progress } from '$lib/game/progress.svelte';

	let { data } = $props();

	// Bumping the key remounts the board, giving the engine a fresh copy of the
	// level; the level number keys navigation between levels.
	let attempt = $state(0);

	// Locked levels can't be reached, not even by typing the URL. localStorage
	// only exists in the browser, so the check runs client-side.
	let allowed = $derived(browser && progress.isUnlocked(data.level.number));

	$effect(() => {
		if (!progress.isUnlocked(data.level.number)) {
			goto('/', { replaceState: true });
		}
	});
</script>

<svelte:head>
	<title>Elemental — {data.level.name}</title>
</svelte:head>

{#if allowed}
	{#key `${data.level.number}:${attempt}`}
		<GameBoard
			level={data.level}
			nextHref={data.nextNumber ? `/play/${data.nextNumber}` : undefined}
			onwin={() => progress.complete(data.level.number)}
			onrestart={() => attempt++}
		/>
	{/key}
{/if}
