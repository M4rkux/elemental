<script lang="ts">
	import type { ElementFace } from '$lib/game/types';

	let { element, animated = false }: { element: ElementFace; animated?: boolean } = $props();

	// Filter ids must be unique per instance: many icons render at once and
	// url(#...) references resolve document-wide.
	const uid = $props.id();
</script>

<!--
	Element glyphs: solid Pokemon-badge silhouettes carved with Avatar-style
	spirals. Carve strokes reuse the element piece's base color so they read as cuts.
-->
{#if element === 'earth'}
	<svg viewBox="0 0 100 100" aria-hidden="true" class:shaking={animated}>
		<g class="rock">
			<path
				fill="#2f1a0a"
				d="M32 14 L68 14 C74 14 76 17 77 22 L88 74 C89 80 85 84 79 84 L21 84 C15 84 11 80 12 74 L23 22 C24 17 26 14 32 14 Z"
			/>
			<path
				fill="none"
				stroke="var(--element-earth)"
				stroke-width="5"
				stroke-linecap="round"
				d="M64 44 A14 14 0 0 1 36 44 A11 11 0 0 1 58 44 A8 8 0 0 1 42 44 A5 5 0 0 1 52 44"
			/>
			<rect x="23" y="66" width="24" height="6" rx="3" fill="var(--element-earth)" />
			<rect x="53" y="66" width="24" height="6" rx="3" fill="var(--element-earth)" />
		</g>
	</svg>
{:else if element === 'fire'}
	<svg viewBox="0 0 100 100" aria-hidden="true" class:burning={animated}>
		{#if animated}
			<defs>
				<!-- Heat wobble: animated noise displaces the flame outline so the
					tongues waver like real fire. -->
				<filter id="{uid}-heat" x="-25%" y="-25%" width="150%" height="150%">
					<feTurbulence type="fractalNoise" baseFrequency="0.022 0.055" numOctaves="2" seed="7" result="noise">
						<animate
							attributeName="baseFrequency"
							dur="1.4s"
							values="0.022 0.055;0.03 0.075;0.026 0.05;0.022 0.055"
							repeatCount="indefinite"
						/>
					</feTurbulence>
					<feDisplacementMap in="SourceGraphic" in2="noise" scale="6" xChannelSelector="R" yChannelSelector="G" />
				</filter>
			</defs>
		{/if}
		<g class="flame" filter={animated ? `url(#${uid}-heat)` : undefined}>
			<path
				fill="#4a0d05"
				d="M50 6 C55 18 67 24 71 36 C74 45 72 52 66 57 C75 54 81 46 82 36 C89 47 92 59 88 69 C82 84 67 93 50 93 C33 93 18 84 12 69 C8 59 11 47 18 36 C19 46 25 54 34 57 C28 52 26 45 29 36 C33 24 45 18 50 6 Z"
			/>
			<path
				fill="none"
				stroke="var(--element-fire)"
				stroke-width="5"
				stroke-linecap="round"
				d="M62 64 A12 12 0 0 1 38 64 A9 9 0 0 1 56 64 A6 6 0 0 1 44 64 A4 4 0 0 1 52 64"
			/>
		</g>
	</svg>
{:else if element === 'water'}
	<svg viewBox="0 0 100 100" aria-hidden="true" class:flowing={animated}>
		<g fill="none" stroke="#0e2f5e" stroke-width="6" stroke-linecap="round">
			<path
				class="wave wave-1"
				d="M86 28 C72 22 60 28 58 42 A16 16 0 0 1 26 42 A12 12 0 0 1 50 42 A8 8 0 0 1 34 42 A5 5 0 0 1 44 42"
			/>
			<path class="wave wave-2" d="M12 64 C26 54 38 55 50 62 C62 69 74 70 88 60" />
			<path class="wave wave-3" d="M18 78 C30 70 42 70 53 76 C64 82 74 82 82 74" />
		</g>
	</svg>
{:else if element === 'air'}
	<svg viewBox="0 0 100 100" aria-hidden="true" class:gusting={animated}>
		<g fill="none" stroke="#47707e" stroke-width="6" stroke-linecap="round">
			<path class="swirl swirl-1" d="M50 40 A14 14 0 0 1 22 40 A10 10 0 0 1 42 40 A6 6 0 0 1 30 40" />
			<path class="swirl swirl-2" d="M77 54 A11 11 0 0 1 55 54 A8 8 0 0 1 71 54 A5 5 0 0 1 61 54" />
			<path class="swirl swirl-3" d="M54 72 A10 10 0 0 1 34 72 A7 7 0 0 1 48 72 A4 4 0 0 1 40 72" />
		</g>
	</svg>
{:else}
	<!-- Mystery: a hidden element, shown as a question mark until revealed. -->
	<svg viewBox="0 0 100 100" aria-hidden="true">
		<g fill="none" stroke="#d9c6f5" stroke-width="9" stroke-linecap="round">
			<path d="M33 34 A17 17 0 1 1 50 53 L50 64" />
		</g>
		<circle cx="50" cy="81" r="6.5" fill="#d9c6f5" />
	</svg>
{/if}

<style lang="scss">
	svg {
		display: block;
		width: var(--icon-size, 66%);
		height: var(--icon-size, 66%);
		pointer-events: none;
	}

	// Burning: the whole flame licks up and sways from its base while the
	// heat filter wobbles the outline.
	.burning .flame {
		transform-box: fill-box;
		transform-origin: 50% 100%;
		animation: flame-flicker 0.85s ease-in-out infinite;
	}

	@keyframes flame-flicker {
		0%,
		100% {
			transform: scale(1, 1);
		}
		25% {
			transform: scale(0.97, 1.06) rotate(-1.2deg);
		}
		55% {
			transform: scale(1.03, 0.95) rotate(1deg);
		}
		80% {
			transform: scale(0.98, 1.04) rotate(-0.6deg);
		}
	}

	// Shaking: the ground rumbles — quick small jitters, no drift.
	.shaking .rock {
		transform-box: fill-box;
		transform-origin: 50% 50%;
		animation: earth-quake 0.4s linear infinite;
	}

	@keyframes earth-quake {
		0%,
		100% {
			transform: translate(0, 0) rotate(0deg);
		}
		20% {
			transform: translate(-1.4px, 0.9px) rotate(-0.9deg);
		}
		40% {
			transform: translate(1.2px, -0.7px) rotate(0.7deg);
		}
		60% {
			transform: translate(-0.9px, -1px) rotate(-0.5deg);
		}
		80% {
			transform: translate(1.3px, 0.8px) rotate(0.8deg);
		}
	}

	// Flowing: waves roll sideways and bob, each on its own phase.
	.flowing .wave {
		transform-box: fill-box;
		transform-origin: 50% 50%;
		animation: water-roll 1.8s ease-in-out infinite;

		&.wave-2 {
			animation-delay: -0.6s;
		}
		&.wave-3 {
			animation-delay: -1.2s;
		}
	}

	@keyframes water-roll {
		0%,
		100% {
			transform: translate(0, 0);
		}
		50% {
			transform: translate(3px, 1.8px);
		}
	}

	// Gusting: each spiral spins like a small vortex, at its own speed.
	.gusting .swirl {
		transform-box: fill-box;
		transform-origin: 50% 50%;
		animation: air-spin 2.4s linear infinite;

		&.swirl-2 {
			animation-duration: 1.9s;
			animation-direction: reverse;
		}
		&.swirl-3 {
			animation-duration: 1.5s;
		}
	}

	@keyframes air-spin {
		to {
			transform: rotate(360deg);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.burning .flame,
		.shaking .rock,
		.flowing .wave,
		.gusting .swirl {
			animation: none;
		}
	}
</style>
