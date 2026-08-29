<script lang="ts">
	import type { KeyColor } from '$lib/game/types';

	let { color }: { color: KeyColor } = $props();
</script>

<!--
	The key hung on an element carrying one. Bit points down-left, bobbing
	gently. Colour of the bow ties it to its vault. `data-key-badge` lets the
	board find it to launch the fly-to-vault animation.
-->
<span class="key-badge" data-key-badge={color} style:--pc="var(--key-{color})" aria-hidden="true">
	<svg viewBox="0 0 100 100">
		<circle cx="27" cy="50" r="19" fill="var(--vault-gold)" />
		<circle cx="27" cy="50" r="18" fill="none" stroke="var(--vault-gold-light)" stroke-width="2" opacity="0.8" />
		<circle cx="27" cy="50" r="7.5" fill="var(--pc)" />
		<rect x="40" y="44" width="50" height="12" rx="5" fill="var(--vault-gold)" />
		<rect x="40" y="44" width="50" height="4" rx="2" fill="var(--vault-gold-light)" opacity="0.55" />
		<rect x="66" y="55" width="8" height="17" rx="3" fill="var(--vault-gold)" />
		<rect x="80" y="55" width="8" height="13" rx="3" fill="var(--vault-gold)" />
	</svg>
</span>

<style lang="scss">
	.key-badge {
		position: absolute;
		right: -0.5rem;
		bottom: -0.1rem;
		width: 1.75rem;
		height: 1.75rem;
		z-index: 4;
		pointer-events: none;
		transform-origin: 50% 50%;
		animation: key-bob 3.2s ease-in-out infinite;
		filter: drop-shadow(0 0 5px var(--pc)) drop-shadow(0 2px 2px rgba(0, 0, 0, 0.7));
	}

	svg {
		display: block;
		width: 100%;
		height: 100%;
	}

	@keyframes key-bob {
		0%,
		100% {
			transform: rotate(-38deg) translateY(0);
		}
		50% {
			transform: rotate(-32deg) translateY(-1.5px);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.key-badge {
			animation: none;
			transform: rotate(-35deg);
		}
	}
</style>
