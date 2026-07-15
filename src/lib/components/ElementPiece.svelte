<script lang="ts">
	import type { ElementFace } from '$lib/game/types';
	import ElementIcon from './ElementIcon.svelte';

	let { element, grabbed = false }: { element: ElementFace; grabbed?: boolean } = $props();
</script>

<div
	class="element"
	class:grabbed
	class:earth={element === 'earth'}
	class:fire={element === 'fire'}
	class:water={element === 'water'}
	class:air={element === 'air'}
	class:mystery={element === 'mystery'}
>
	<ElementIcon {element} animated={grabbed} />
</div>

<style lang="scss">
	.element {
		width: var(--element-size, 3.25rem);
		height: var(--element-size, 3.25rem);
		display: grid;
		place-items: center;
		border-radius: 50%;
		border: 2px solid rgba(40, 20, 5, 0.45);
		box-shadow:
			inset -6px -8px 12px rgba(0, 0, 0, 0.35),
			inset 5px 6px 10px rgba(255, 255, 255, 0.35),
			0 3px 6px rgba(40, 20, 5, 0.4);
		flex-shrink: 0;

		&.grabbed {
			transform: scale(1.08);
			box-shadow:
				inset -6px -8px 12px rgba(0, 0, 0, 0.35),
				inset 5px 6px 10px rgba(255, 255, 255, 0.35),
				0 10px 16px rgba(40, 20, 5, 0.5);
		}

		&.earth {
			background: radial-gradient(circle at 35% 30%, var(--element-earth-light), var(--element-earth) 70%);
		}
		&.fire {
			background: radial-gradient(circle at 35% 30%, var(--element-fire-light), var(--element-fire) 70%);
		}
		&.water {
			background: radial-gradient(circle at 35% 30%, var(--element-water-light), var(--element-water) 70%);
		}
		&.air {
			background: radial-gradient(circle at 35% 30%, var(--element-air-light), var(--element-air) 75%);
		}
		&.mystery {
			background: radial-gradient(circle at 35% 30%, var(--element-mystery-light), var(--element-mystery) 70%);
		}
	}
</style>
