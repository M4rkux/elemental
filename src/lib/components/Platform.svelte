<script lang="ts">
	import ElementIcon from './ElementIcon.svelte';
	import Sphere from './Sphere.svelte';
	import type { Element, PlatformType } from '$lib/game/types';

	let {
		type,
		spheres,
		maxPerPlatform,
		complete,
		pickable,
		hiddenFrom = null,
		dropState = null,
		onGrab,
		el = $bindable()
	}: {
		type: PlatformType;
		spheres: Element[];
		maxPerPlatform: number;
		complete: boolean;
		pickable: (index: number) => boolean;
		/** While a drag is in progress, spheres from this index down are lifted off the rope. */
		hiddenFrom?: number | null;
		dropState?: 'valid' | 'invalid' | null;
		onGrab: (index: number, event: PointerEvent) => void;
		el?: HTMLElement;
	} = $props();
</script>

<div
	class="platform"
	class:platform--valid={dropState === 'valid'}
	class:platform--invalid={dropState === 'invalid'}
	class:platform--complete={complete}
	style:--slots={maxPerPlatform}
	bind:this={el}
>
	<div
		class="base plank"
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
		{#if complete}
			<span class="check">✓</span>
		{/if}
	</div>

	<div class="rope-area">
		<div class="rope"></div>
		{#each spheres as element, i (i)}
			<button
				type="button"
				class="slot"
				class:slot--lifted={hiddenFrom !== null && i >= hiddenFrom}
				class:slot--pickable={pickable(i)}
				aria-label="{element} sphere"
				onpointerdown={(e) => onGrab(i, e)}
			>
				<Sphere {element} />
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

	.check {
		position: absolute;
		top: 50%;
		right: 0.35rem;
		translate: 0 -50%;
		font-weight: 700;
		color: #2e6b1f;
		text-shadow: 0 1px 0 rgba(255, 255, 255, 0.5);
	}

	.rope-area {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.3rem;
		padding-top: 0.35rem;
		// Room for a full rope of spheres (3.25rem sphere + 0.3rem gap each),
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
