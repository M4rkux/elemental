<script lang="ts">
	import type { KeyColor } from '$lib/game/types';

	let {
		color,
		phase
	}: {
		color: KeyColor;
		/** sealed = idle; then the open sequence: key lands, lock turns, box splits, contents show. */
		phase: 'sealed' | 'unlocking' | 'opening' | 'revealing';
	} = $props();
</script>

<!--
	A black vault box hovering the whole column, a gold padlock at its middle.
	Sealed: floats gently, lock glows. Unlocking: shudders, lock flashes, the
	shackle springs open. Opening: the two halves swing apart and fade, the
	lock puffs out. Mirrors the Claude Design "Key & Vault" reference.
-->
<div
	class="vault"
	class:vault--sealed={phase === 'sealed'}
	class:vault--unlocking={phase === 'unlocking'}
	class:vault--opening={phase === 'opening' || phase === 'revealing'}
	style:--pc="var(--key-{color})"
	aria-hidden="true"
>
	<div class="halves">
		<div class="half half--left"></div>
		<div class="half half--right"></div>
	</div>
	<div class="seam"></div>

	<span class="lock">
		<svg viewBox="0 0 100 100" style="overflow:visible">
			<g class="shackle">
				<path d="M32 48 V34 a18 18 0 0 1 36 0 V48" fill="none" stroke="var(--vault-gold-deep)" stroke-width="10" stroke-linecap="round" />
				<path d="M32 48 V34 a18 18 0 0 1 36 0 V48" fill="none" stroke="var(--gold-btn-1)" stroke-width="3.5" stroke-linecap="round" opacity="0.55" />
			</g>
			<rect x="19" y="46" width="62" height="44" rx="10" fill="var(--vault-gold)" />
			<rect x="19" y="46" width="62" height="44" rx="10" fill="none" stroke="var(--vault-gold-light)" stroke-width="2" opacity="0.7" />
			<rect x="24" y="50" width="52" height="9" rx="4.5" fill="var(--vault-gold-light)" opacity="0.4" />
			<circle cx="50" cy="66" r="11" fill="var(--pc)" opacity="0.45" />
			<circle cx="50" cy="66" r="7" fill="var(--gold-ink)" />
			<rect x="46.5" y="66" width="7" height="16" rx="3" fill="var(--gold-ink)" />
		</svg>
	</span>
</div>

<style lang="scss">
	.vault {
		position: absolute;
		inset: 0;
		z-index: 5;
		perspective: 800px;
		pointer-events: none;

		&--sealed {
			animation: vault-float 5s ease-in-out infinite;
		}
		&--unlocking {
			animation: vault-shudder 0.45s ease-in-out 2;
		}
	}

	.halves {
		position: absolute;
		inset: 0;
		display: flex;
	}

	.half {
		width: 50%;
		height: 100%;
		border: 1px solid rgba(255, 225, 170, 0.26);
		box-shadow:
			0 14px 30px rgba(0, 0, 0, 0.6),
			inset 0 1px 0 rgba(255, 235, 190, 0.16);

		&--left {
			border-radius: 14px 0 0 14px;
			border-right: none;
			transform-origin: left center;
			background: linear-gradient(150deg, #181c26, #0b0e16 55%, #04050a);
		}
		&--right {
			border-radius: 0 14px 14px 0;
			border-left: none;
			transform-origin: right center;
			background: linear-gradient(210deg, #181c26, #0b0e16 55%, #04050a);
		}
	}

	.seam {
		position: absolute;
		top: 6%;
		bottom: 6%;
		left: 50%;
		width: 1px;
		margin-left: -0.5px;
		background: linear-gradient(180deg, transparent, rgba(255, 225, 170, 0.75), transparent);
		animation: seam-glow 3.4s ease-in-out infinite;
	}

	.lock {
		position: absolute;
		left: 50%;
		top: 44%;
		transform: translate(-50%, -50%);
		width: 3.1rem;
		height: 3.1rem;
		animation: lock-pulse 2.6s ease-in-out infinite;

		svg {
			display: block;
			width: 100%;
			height: 100%;
		}
	}

	.shackle {
		transform-box: fill-box;
		transform-origin: 72% 100%;
	}

	// Unlocking: lock flashes bright, shackle springs.
	.vault--unlocking .lock {
		animation: lock-flash 0.5s ease-out both;
	}
	.vault--unlocking .shackle,
	.vault--opening .shackle {
		animation: shackle-pop 0.45s cubic-bezier(0.3, 1.5, 0.5, 1) 0.1s forwards;
	}

	// Opening: halves swing apart and fade, seam dims, lock puffs out.
	.vault--opening .half--left {
		animation: half-open-left 0.7s cubic-bezier(0.3, 0.1, 0.4, 1) forwards;
	}
	.vault--opening .half--right {
		animation: half-open-right 0.7s cubic-bezier(0.3, 0.1, 0.4, 1) forwards;
	}
	.vault--opening .seam {
		opacity: 0;
	}
	.vault--opening .lock {
		animation: lock-vanish 0.5s ease-out forwards;
	}

	@keyframes vault-float {
		0%,
		100% {
			transform: translateY(0) rotate(0);
		}
		35% {
			transform: translateY(-3px) rotate(-0.3deg);
		}
		70% {
			transform: translateY(2px) rotate(0.25deg);
		}
	}
	@keyframes vault-shudder {
		0%,
		100% {
			transform: translate(0, 0);
		}
		20% {
			transform: translate(-2px, 1px);
		}
		45% {
			transform: translate(2px, -1px);
		}
		70% {
			transform: translate(-1px, -1px);
		}
	}
	@keyframes seam-glow {
		0%,
		100% {
			opacity: 0.35;
		}
		50% {
			opacity: 0.9;
		}
	}
	@keyframes lock-pulse {
		0%,
		100% {
			filter: drop-shadow(0 0 3px var(--pc)) drop-shadow(0 2px 3px rgba(0, 0, 0, 0.8));
		}
		50% {
			filter: drop-shadow(0 0 10px var(--pc)) drop-shadow(0 2px 3px rgba(0, 0, 0, 0.8));
		}
	}
	@keyframes lock-flash {
		0% {
			filter: brightness(1);
		}
		30% {
			filter: brightness(2.8) drop-shadow(0 0 14px var(--gold-2));
		}
		100% {
			filter: brightness(1.2);
		}
	}
	@keyframes shackle-pop {
		0% {
			transform: rotate(0) translateY(0);
		}
		55% {
			transform: rotate(-38deg) translateY(-7px);
		}
		100% {
			transform: rotate(-30deg) translateY(-6px);
		}
	}
	@keyframes lock-vanish {
		0% {
			opacity: 1;
			transform: translate(-50%, -50%) scale(1);
		}
		100% {
			opacity: 0;
			transform: translate(-50%, -50%) scale(1.35);
		}
	}
	@keyframes half-open-left {
		0% {
			transform: rotateY(0) translateX(0);
			opacity: 1;
		}
		22% {
			transform: rotateY(-5deg) translateX(-2px);
		}
		100% {
			transform: rotateY(-36deg) translateX(-12px);
			opacity: 0;
		}
	}
	@keyframes half-open-right {
		0% {
			transform: rotateY(0) translateX(0);
			opacity: 1;
		}
		22% {
			transform: rotateY(5deg) translateX(2px);
		}
		100% {
			transform: rotateY(36deg) translateX(12px);
			opacity: 0;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.vault,
		.vault--unlocking .lock,
		.vault--unlocking .shackle,
		.vault--opening .shackle,
		.seam,
		.lock {
			animation: none;
		}
		.vault--opening .half--left,
		.vault--opening .half--right {
			animation: none;
			opacity: 0;
		}
	}
</style>
