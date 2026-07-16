<script lang="ts">
	// Ambient backdrop: two drifting color blobs plus floating dust motes.
	// Mote layout is a deterministic formula (not Math.random) so server and
	// client render identically and hydration never mismatches.
	const motes = Array.from({ length: 16 }, (_, i) => ({
		id: i,
		left: (i * 61 + 7) % 100,
		top: 15 + ((i * 37) % 80),
		size: 2 + (i % 3),
		duration: 7 + (i % 5) * 2,
		delay: (i * 1.3) % 8
	}));
</script>

<div class="aurora" aria-hidden="true">
	<div class="blob blob-a"></div>
	<div class="blob blob-b"></div>
	<div class="motes">
		{#each motes as m (m.id)}
			<span
				style:left="{m.left}%"
				style:top="{m.top}%"
				style:width="{m.size}px"
				style:height="{m.size}px"
				style:animation-duration="{m.duration}s"
				style:animation-delay="{m.delay}s"
			></span>
		{/each}
	</div>
</div>

<style lang="scss">
	.aurora {
		position: fixed;
		inset: 0;
		z-index: 0;
		overflow: hidden;
		pointer-events: none;
	}

	.blob {
		position: absolute;
		border-radius: 50%;
		filter: blur(50px);
		animation: drift 16s ease-in-out infinite;
	}

	.blob-a {
		left: 8%;
		top: -12%;
		width: 520px;
		height: 420px;
		background: radial-gradient(circle, rgba(80, 140, 255, 0.16), transparent 65%);
	}

	.blob-b {
		right: 4%;
		top: 22%;
		width: 460px;
		height: 400px;
		background: radial-gradient(circle, rgba(150, 90, 230, 0.13), transparent 65%);
		filter: blur(56px);
		animation-name: drift2;
		animation-duration: 20s;
	}

	.motes span {
		position: absolute;
		border-radius: 50%;
		background: rgba(220, 230, 255, 0.8);
		box-shadow: 0 0 6px rgba(200, 215, 255, 0.8);
		animation-name: moteFloat;
		animation-timing-function: ease-in-out;
		animation-iteration-count: infinite;
		opacity: 0;
	}

	@keyframes drift {
		0%,
		100% {
			transform: translate(0, 0) scale(1);
		}
		50% {
			transform: translate(50px, -30px) scale(1.12);
		}
	}

	@keyframes drift2 {
		0%,
		100% {
			transform: translate(0, 0) scale(1.1);
		}
		50% {
			transform: translate(-60px, 24px) scale(1);
		}
	}

	@keyframes moteFloat {
		0% {
			transform: translateY(0);
			opacity: 0;
		}
		12% {
			opacity: 0.7;
		}
		88% {
			opacity: 0.5;
		}
		100% {
			transform: translateY(-90px);
			opacity: 0;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.blob {
			animation: none;
		}
		.motes {
			display: none;
		}
	}
</style>
