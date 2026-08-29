import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		projects: [
			{
				// Plain-TypeScript solver / level tests — no Svelte needed.
				test: {
					name: 'solver',
					include: ['scripts/**/*.test.ts']
				}
			},
			{
				// Tests that import the runes-based engine (`*.svelte.ts`).
				plugins: [svelte({ compilerOptions: { runes: true } })],
				test: {
					name: 'engine',
					include: ['src/**/*.test.ts']
				}
			}
		]
	}
});
