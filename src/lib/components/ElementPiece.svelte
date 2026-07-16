<script lang="ts">
	import type { ElementFace } from '$lib/game/types';
	import ElementIcon from './ElementIcon.svelte';
	import ElementParticles from './ElementParticles.svelte';

	let {
		element,
		grabbed = false,
		complete = false
	}: { element: ElementFace; grabbed?: boolean; complete?: boolean } = $props();
</script>

<div
	class="element"
	class:grabbed
	class:complete
	class:earth={element === 'earth'}
	class:fire={element === 'fire'}
	class:water={element === 'water'}
	class:air={element === 'air'}
	class:mystery={element === 'mystery'}
>
	<ElementIcon {element} animated={grabbed} />
	{#if grabbed && element !== 'mystery'}
		<!-- Fire and air particles float up; earth and water particles sink. -->
		<ElementParticles {element} mode={element === 'fire' || element === 'air' ? 'rise' : 'fall'} />
	{/if}
</div>

<style lang="scss">
	.element {
		--piece-glow: transparent;
		--piece-glow-blur: 14px;
		position: relative;
		width: var(--element-size, 3.25rem);
		height: var(--element-size, 3.25rem);
		display: grid;
		place-items: center;
		border-radius: 50%;
		border: 1px solid rgba(255, 255, 255, 0.18);
		box-shadow:
			inset -6px -8px 12px rgba(0, 0, 0, 0.35),
			inset 5px 6px 10px rgba(255, 255, 255, 0.25),
			0 6px 16px rgba(0, 0, 0, 0.45),
			0 0 var(--piece-glow-blur) var(--piece-glow);
		flex-shrink: 0;
		transition: box-shadow 0.2s ease;

		&.grabbed {
			--piece-glow-blur: 28px;
			transform: scale(1.08);
			box-shadow:
				inset -6px -8px 12px rgba(0, 0, 0, 0.35),
				inset 5px 6px 10px rgba(255, 255, 255, 0.25),
				0 10px 20px rgba(0, 0, 0, 0.5),
				0 0 var(--piece-glow-blur) var(--piece-glow);
		}

		// Pieces on a completed platform are sealed with a golden ring.
		&.complete {
			box-shadow:
				inset -6px -8px 12px rgba(0, 0, 0, 0.35),
				inset 5px 6px 10px rgba(255, 255, 255, 0.25),
				0 6px 16px rgba(0, 0, 0, 0.45),
				0 0 var(--piece-glow-blur) var(--piece-glow),
				0 0 0 3px rgba(255, 215, 130, 0.85),
				0 0 26px rgba(255, 200, 110, 0.55);
		}

		&.earth {
			background: radial-gradient(circle at 35% 30%, var(--element-earth-light), var(--element-earth) 70%);
			--piece-glow: var(--element-earth-glow);
		}
		&.fire {
			background: radial-gradient(circle at 35% 30%, var(--element-fire-light), var(--element-fire) 70%);
			--piece-glow: var(--element-fire-glow);
		}
		&.water {
			background: radial-gradient(circle at 35% 30%, var(--element-water-light), var(--element-water) 70%);
			--piece-glow: var(--element-water-glow);
		}
		&.air {
			background: radial-gradient(circle at 35% 30%, var(--element-air-light), var(--element-air) 75%);
			--piece-glow: var(--element-air-glow);
		}
		&.mystery {
			background: radial-gradient(circle at 35% 30%, var(--element-mystery-light), var(--element-mystery) 70%);
			--piece-glow: var(--element-mystery-glow);
		}
	}
</style>
