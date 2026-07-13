import { defineConfig } from 'vitest/config';

// Standalone config: solver tests are plain TypeScript and don't need the
// SvelteKit plugins from vite.config.ts.
export default defineConfig({
	test: {
		include: ['scripts/**/*.test.ts']
	}
});
