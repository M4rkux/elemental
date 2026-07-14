<script lang="ts">
	import type { ElementFace } from '$lib/game/types';

	let { element }: { element: ElementFace } = $props();
</script>

<!--
	Element glyphs: solid Pokemon-badge silhouettes carved with Avatar-style
	spirals. Carve strokes reuse the element piece's base color so they read as cuts.
-->
{#if element === 'earth'}
	<svg viewBox="0 0 100 100" aria-hidden="true">
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
	</svg>
{:else if element === 'fire'}
	<svg viewBox="0 0 100 100" aria-hidden="true">
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
	</svg>
{:else if element === 'water'}
	<svg viewBox="0 0 100 100" aria-hidden="true">
		<g fill="none" stroke="#0e2f5e" stroke-width="6" stroke-linecap="round">
			<path
				d="M86 28 C72 22 60 28 58 42 A16 16 0 0 1 26 42 A12 12 0 0 1 50 42 A8 8 0 0 1 34 42 A5 5 0 0 1 44 42"
			/>
			<path d="M12 64 C26 54 38 55 50 62 C62 69 74 70 88 60" />
			<path d="M18 78 C30 70 42 70 53 76 C64 82 74 82 82 74" />
		</g>
	</svg>
{:else if element === 'air'}
	<svg viewBox="0 0 100 100" aria-hidden="true">
		<g fill="none" stroke="#47707e" stroke-width="6" stroke-linecap="round">
			<path d="M50 40 A14 14 0 0 1 22 40 A10 10 0 0 1 42 40 A6 6 0 0 1 30 40" />
			<path d="M77 54 A11 11 0 0 1 55 54 A8 8 0 0 1 71 54 A5 5 0 0 1 61 54" />
			<path d="M54 72 A10 10 0 0 1 34 72 A7 7 0 0 1 48 72 A4 4 0 0 1 40 72" />
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
</style>
