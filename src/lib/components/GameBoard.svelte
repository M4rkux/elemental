<script lang="ts">
	import { GameEngine } from '$lib/game/engine.svelte';
	import type { Element, PhaseData } from '$lib/game/types';
	import Platform from './Platform.svelte';
	import Sphere from './Sphere.svelte';

	let {
		phase,
		nextHref,
		onwin,
		onrestart
	}: { phase: PhaseData; nextHref?: string; onwin?: () => void; onrestart: () => void } = $props();

	// The board is remounted (keyed) for restarts, so reading `phase` once is intentional.
	// svelte-ignore state_referenced_locally
	const engine = new GameEngine(phase);

	interface Drag {
		from: number;
		index: number;
		group: Element[];
		x: number;
		y: number;
		offsetX: number;
		offsetY: number;
	}

	$effect(() => {
		if (engine.won) onwin?.();
	});

	let drag = $state<Drag | null>(null);
	let dropTarget = $state<number | null>(null);
	let platformEls: (HTMLElement | undefined)[] = $state([]);

	function grab(platform: number, index: number, event: PointerEvent) {
		if (engine.won || drag || !engine.canPick(platform, index)) return;
		event.preventDefault();
		const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
		drag = {
			from: platform,
			index,
			group: engine.groupAt(platform, index),
			x: event.clientX,
			y: event.clientY,
			offsetX: event.clientX - rect.left,
			offsetY: event.clientY - rect.top
		};
		dropTarget = null;
	}

	function targetAt(x: number, y: number): number | null {
		for (let i = 0; i < platformEls.length; i++) {
			const el = platformEls[i];
			if (!el || i === drag?.from) continue;
			const rect = el.getBoundingClientRect();
			if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
				return i;
			}
		}
		return null;
	}

	function onPointerMove(event: PointerEvent) {
		if (!drag) return;
		drag.x = event.clientX;
		drag.y = event.clientY;
		dropTarget = targetAt(event.clientX, event.clientY);
	}

	function onPointerUp() {
		if (!drag) return;
		if (dropTarget !== null) {
			engine.move(drag.from, drag.index, dropTarget);
		}
		drag = null;
		dropTarget = null;
	}

	function dropStateFor(platform: number): 'valid' | 'invalid' | null {
		if (!drag || dropTarget !== platform) return null;
		return engine.canDrop(platform, drag.group[0], drag.group.length) ? 'valid' : 'invalid';
	}
</script>

<svelte:window onpointermove={onPointerMove} onpointerup={onPointerUp} onpointercancel={onPointerUp} />

<div class="board" class:board--dragging={drag !== null}>
	<header class="hud">
		<a class="hud-button plank" href="/">Menu</a>
		<div class="hud-title">
			<h1>{engine.phaseName}</h1>
			<p>Moves: {engine.moves}</p>
		</div>
		<div class="hud-actions">
			<button
				class="hud-button plank"
				disabled={!engine.canUndo}
				onclick={() => engine.undo()}
			>
				Undo
			</button>
			<button class="hud-button plank" onclick={onrestart}>Restart</button>
		</div>
	</header>

	<div class="platforms">
		{#each engine.platforms as spheres, i (i)}
			<Platform
				type={engine.platformTypes[i]}
				{spheres}
				maxPerPlatform={engine.maxPerPlatform}
				complete={engine.isComplete(i)}
				pickable={(index) => !drag && !engine.won && engine.canPick(i, index)}
				hiddenFrom={drag?.from === i ? drag.index : null}
				dropState={dropStateFor(i)}
				onGrab={(index, event) => grab(i, index, event)}
				bind:el={platformEls[i]}
			/>
		{/each}
	</div>

	{#if drag}
		<div class="ghost" style:left="{drag.x - drag.offsetX}px" style:top="{drag.y - drag.offsetY}px">
			{#each drag.group as element, i (i)}
				<Sphere {element} grabbed />
			{/each}
		</div>
	{/if}

	{#if engine.won}
		<div class="win-overlay">
			<div class="win-panel plank">
				<h2>Elements in harmony!</h2>
				<p>Sorted in {engine.moves} moves.</p>
				<div class="win-actions">
					{#if nextHref}
						<a class="hud-button hud-button--primary plank" href={nextHref}>Next level</a>
					{/if}
					<button class="hud-button plank" onclick={onrestart}>Play again</button>
					<a class="hud-button plank" href="/">Menu</a>
				</div>
			</div>
		</div>
	{/if}
</div>

<style lang="scss">
	.board {
		max-width: 42rem;
		margin: 0 auto;
		padding: 1rem;
		user-select: none;
		-webkit-user-select: none;
		touch-action: none;

		&--dragging {
			cursor: grabbing;
		}
	}

	.hud {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		margin-bottom: 1.5rem;
	}

	.hud-title {
		text-align: center;

		h1 {
			font-size: 1.4rem;
			font-weight: 700;
			color: var(--wood-highlight);
			text-shadow: 0 2px 3px rgba(40, 20, 5, 0.6);
		}

		p {
			color: var(--wood-lighter);
			font-size: 0.9rem;
		}
	}

	.hud-actions {
		display: flex;
		gap: 0.5rem;
	}

	.hud-button {
		padding: 0.45rem 1rem;
		font-weight: 700;
		font-size: 0.9rem;
		color: var(--wood-darkest);
		cursor: pointer;
		text-decoration: none;

		&:disabled {
			opacity: 0.45;
			filter: saturate(0.6);
			cursor: not-allowed;
		}

		&:hover:not(:disabled) {
			filter: brightness(1.08);
		}

		&:active {
			transform: translateY(1px);
		}

		&--primary {
			background:
				repeating-linear-gradient(
					90deg,
					rgba(62, 36, 19, 0.12) 0px,
					rgba(62, 36, 19, 0.12) 2px,
					transparent 2px,
					transparent 18px
				),
				linear-gradient(180deg, var(--wood-highlight), var(--wood-lighter));
		}
	}

	.platforms {
		display: flex;
		justify-content: center;
		gap: clamp(0.4rem, 2vw, 1.25rem);
	}

	.ghost {
		position: fixed;
		z-index: 50;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.3rem;
		pointer-events: none;
	}

	.win-overlay {
		position: fixed;
		inset: 0;
		z-index: 100;
		display: grid;
		place-items: center;
		background: rgba(40, 20, 5, 0.55);
	}

	.win-panel {
		padding: 2rem 2.5rem;
		text-align: center;

		h2 {
			font-size: 1.5rem;
			font-weight: 700;
			margin-bottom: 0.5rem;
		}

		p {
			margin-bottom: 1.25rem;
		}
	}

	.win-actions {
		display: flex;
		justify-content: center;
		gap: 0.75rem;
	}
</style>
