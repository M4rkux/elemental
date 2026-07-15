<script lang="ts">
	import type { Element } from '$lib/game/types';

	let {
		element,
		mode
	}: {
		element: Element;
		/**
		 * rise/fall: a continuous stream while the piece is held (fire/air go
		 * up, earth/water go down). burst: a brief one-shot ring when placed.
		 */
		mode: 'rise' | 'fall' | 'burst';
	} = $props();

	// A particles instance never changes mode: streams live for the whole
	// grab, bursts are one-shot. Reading `mode` once is intentional.
	// svelte-ignore state_referenced_locally
	const count = mode === 'burst' ? 12 : 8;

	// Trajectories are randomized once per instance; the CSS vars drive the
	// keyframes. Stream particles loop with negative delays so the emission
	// looks already in progress on the first frame.
	const particles = Array.from({ length: count }, (_, i) => {
		if (mode === 'burst') {
			const angle = (i / count) * 2 * Math.PI + (Math.random() - 0.5) * 0.6;
			// The piece is 3.25rem (52px) wide; end a few px past its edge.
			const dist = 30 + Math.random() * 8;
			return {
				x: 0,
				y: 0,
				dx: Math.cos(angle) * dist,
				dy: Math.sin(angle) * dist,
				size: 3.5 + Math.random() * 3,
				delay: Math.random() * 0.05,
				dur: 0.35 + Math.random() * 0.15
			};
		}
		const dir = mode === 'rise' ? -1 : 1;
		return {
			x: 15 + Math.random() * 70,
			y: 35 + Math.random() * 30,
			dx: (Math.random() - 0.5) * 14,
			dy: dir * (26 + Math.random() * 18),
			size: 2.5 + Math.random() * 3,
			delay: -Math.random() * 1.4,
			dur: 1 + Math.random() * 0.6
		};
	});
</script>

<div class="particles" class:burst={mode === 'burst'}>
	{#each particles as p, i (i)}
		<span
			style:left="{p.x}%"
			style:top="{p.y}%"
			style:width="{p.size}px"
			style:height="{p.size}px"
			style:background="var(--element-{element}-light)"
			style:--dx="{p.dx}px"
			style:--dy="{p.dy}px"
			style:animation-delay="{p.delay}s"
			style:animation-duration="{p.dur}s"
		></span>
	{/each}
</div>

<style lang="scss">
	.particles {
		position: absolute;
		inset: 0;
		overflow: visible;
		pointer-events: none;

		span {
			position: absolute;
			border-radius: 50%;
			box-shadow: 0 0 4px rgba(255, 255, 255, 0.35);
			animation: particle-stream linear infinite;
		}

		&.burst span {
			animation: particle-burst ease-out forwards;
		}
	}

	@keyframes particle-stream {
		0% {
			transform: translate(0, 0) scale(1);
			opacity: 0;
		}
		15% {
			opacity: 0.9;
		}
		100% {
			transform: translate(var(--dx), var(--dy)) scale(0.35);
			opacity: 0;
		}
	}

	@keyframes particle-burst {
		0% {
			transform: translate(0, 0) scale(1);
			opacity: 1;
		}
		100% {
			transform: translate(var(--dx), var(--dy)) scale(0.3);
			opacity: 0;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.particles {
			display: none;
		}
	}
</style>
