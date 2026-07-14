<script lang="ts">
	import ElementIcon from './ElementIcon.svelte';
	import ElementPiece from './ElementPiece.svelte';
	import type { ElementSlot, PlatformType } from '$lib/game/types';

	let {
		type,
		slots,
		maxPerPlatform,
		complete,
		pickable,
		hiddenFrom = null,
		dropState = null,
		onGrab,
		el = $bindable()
	}: {
		type: PlatformType;
		slots: ElementSlot[];
		maxPerPlatform: number;
		complete: boolean;
		pickable: (index: number) => boolean;
		/** While a drag is in progress, elements from this index down are lifted off the rope. */
		hiddenFrom?: number | null;
		dropState?: 'valid' | 'invalid' | null;
		onGrab: (index: number, event: PointerEvent) => void;
		el?: HTMLElement;
	} = $props();

	// The color a completed platform (base and rope) fills with.
	let completeTint = $derived(
		complete && slots.length > 0 ? `var(--element-${slots[0].element})` : null
	);
</script>

<div
	class="platform"
	class:platform--valid={dropState === 'valid'}
	class:platform--invalid={dropState === 'invalid'}
	class:platform--complete={complete}
	style:--slots={maxPerPlatform}
	style:--complete-tint={completeTint}
	bind:this={el}
>
	<div
		class="base plank"
		class:base--complete={complete}
		class:base--tinted={type !== 'neutral'}
		class:base--earth={type === 'earth'}
		class:base--fire={type === 'fire'}
		class:base--water={type === 'water'}
		class:base--air={type === 'air'}
	>
		{#if type !== 'neutral'}
			<span class="badge" title="Must be completed with {type}">
				<ElementIcon element={type} />
			</span>
		{/if}
	</div>

	<div class="rope-area">
		<div class="rope"></div>
		{#each slots as slot, i (i)}
			<button
				type="button"
				class="slot"
				class:slot--lifted={hiddenFrom !== null && i >= hiddenFrom}
				class:slot--pickable={pickable(i)}
				aria-label={slot.revealed ? `${slot.element} element` : 'mystery element'}
				onpointerdown={(e) => onGrab(i, e)}
			>
				<ElementPiece element={slot.revealed ? slot.element : 'mystery'} />
			</button>
		{/each}
	</div>
</div>

<style lang="scss">
	.platform {
		display: flex;
		flex-direction: column;
		align-items: center;
		width: clamp(4.5rem, 17vw, 6.5rem);
		border-radius: 12px;
		transition: background-color 120ms ease;

		&--valid {
			background: rgba(255, 240, 190, 0.28);
			box-shadow: 0 0 0 3px rgba(255, 235, 170, 0.55);
		}

		&--invalid {
			background: rgba(120, 30, 10, 0.15);
		}

		&--complete .rope-area {
			filter: saturate(1.15) brightness(1.05);
		}

		// Once the base fill lands, the color continues sweeping down the rope.
		&--complete .rope::after {
			content: '';
			position: absolute;
			inset: 0;
			border-radius: inherit;
			background: var(--complete-tint);
			animation: fill-down 450ms ease-in 250ms both;
		}
	}

	.base {
		position: relative;
		width: 100%;
		height: 1.9rem;
		z-index: 1;

		// Element-restricted platforms are tinted with their element's color.
		&--tinted::after {
			content: '';
			position: absolute;
			inset: 0;
			border-radius: inherit;
			background: var(--tint);
			opacity: 0.45;
		}

		&--earth {
			--tint: var(--element-earth);
		}
		&--fire {
			--tint: var(--element-fire);
		}
		&--water {
			--tint: var(--element-water);
		}
		&--air {
			--tint: var(--element-air-light);
		}

		// Completed platforms fill with the element's color and look pressed
		// in: the plank's top light is swapped for an inner shadow. The fill
		// sweeps top to bottom before continuing down the rope. It lives in
		// ::before (::after holds the restricted tint) so the badge, a later
		// sibling with the same z-index, still paints on top.
		&--complete {
			border: none;
			box-shadow: 0 4px 10px rgba(40, 20, 5, 0.45);

			&::before {
				content: '';
				position: absolute;
				inset: 0;
				z-index: 1;
				border-radius: inherit;
				background: var(--complete-tint);
				box-shadow:
					inset 0 4px 8px rgba(0, 0, 0, 0.45),
					inset 0 -2px 4px rgba(0, 0, 0, 0.2);
				animation: fill-down 250ms ease-out both;
			}
		}
	}

	// Reveals the element color from top to bottom.
	@keyframes fill-down {
		from {
			clip-path: inset(0 0 100% 0);
		}
		to {
			clip-path: inset(0 0 0 0);
		}
	}

	.badge {
		position: absolute;
		top: 50%;
		left: 50%;
		translate: -50% -50%;
		z-index: 1;
		width: 1.5rem;
		height: 1.5rem;
		--icon-size: 100%;
		display: flex;
	}

	.rope-area {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.3rem;
		padding-top: 0.35rem;
		// Room for a full rope of elements (3.25rem piece + 0.3rem gap each),
		// so drops on empty space still hit the platform.
		min-height: calc(var(--slots) * 3.55rem + 1rem);
		width: 100%;
	}

	.rope {
		position: absolute;
		top: -0.5rem;
		bottom: 1rem;
		width: 6px;
		background: repeating-linear-gradient(
			180deg,
			var(--wood-highlight) 0px,
			var(--wood-lighter) 3px,
			var(--wood-mid) 6px
		);
		border-radius: 3px;
		box-shadow: 0 0 4px rgba(40, 20, 5, 0.4);
	}

	.slot {
		position: relative;
		padding: 0;
		border: none;
		background: none;
		display: flex;
		touch-action: none;
		cursor: default;

		&--pickable {
			cursor: grab;
		}

		&--lifted {
			visibility: hidden;
		}
	}
</style>
