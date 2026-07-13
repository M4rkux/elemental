import { readFileSync, readdirSync } from 'fs';
import { describe, expect, it } from 'vitest';
import { ELEMENTS, type PhaseData } from '../src/lib/game/types';
import {
	MAX_PER_PLATFORM,
	isComplete,
	isWon,
	levelFromPhase,
	restrictedElements,
	solve
} from './solver';

const files = readdirSync('static/phases')
	.filter((f) => f.endsWith('.json'))
	.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

it('has phases to test', () => {
	expect(files.length).toBeGreaterThan(0);
});

describe.each(files)('%s', (file) => {
	const phase: PhaseData = JSON.parse(readFileSync(`static/phases/${file}`, 'utf8'));
	const level = levelFromPhase(phase);
	const restricted = restrictedElements(level.types);

	it('matches the capacity the solver assumes', () => {
		expect(phase.maxPerPlatform).toBe(MAX_PER_PLATFORM);
		for (const stack of level.stacks) {
			expect(stack.length).toBeLessThanOrEqual(phase.maxPerPlatform);
		}
	});

	it('has exactly 4 spheres of each element', () => {
		const all = level.stacks.flat();
		for (const element of ELEMENTS) {
			expect(all.filter((s) => s === element)).toHaveLength(4);
		}
	});

	it('starts restricted platforms with their own element', () => {
		for (let i = 0; i < level.stacks.length; i++) {
			const type = level.types[i];
			if (type === 'neutral') continue;
			expect(level.stacks[i][0]).toBe(type);
		}
	});

	it('does not start won or with a completed platform', () => {
		expect(isWon(level.stacks, level.types, restricted)).toBe(false);
		for (let i = 0; i < level.stacks.length; i++) {
			expect(isComplete(level.stacks[i], level.types[i], restricted)).toBe(false);
		}
	});

	it('is solvable', () => {
		expect(solve(level)).toBeGreaterThan(0);
	});
});
