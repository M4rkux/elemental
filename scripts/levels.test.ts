import { readFileSync, readdirSync } from 'fs';
import { describe, expect, it } from 'vitest';
import { ELEMENTS, type LevelData } from '../src/lib/game/types';
import {
	MAX_PER_PLATFORM,
	boardFromLevel,
	isComplete,
	isWon,
	restrictedElements,
	solve
} from './solver';

const files = readdirSync('db/seeds/levels')
	.filter((f) => f.endsWith('.json'))
	.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

it('has levels to test', () => {
	expect(files.length).toBeGreaterThan(0);
});

it('has unique, contiguous level numbers starting at 1', () => {
	const numbers = files
		.map((f) => (JSON.parse(readFileSync(`db/seeds/levels/${f}`, 'utf8')) as LevelData).number)
		.sort((a, b) => a - b);
	expect(numbers).toEqual(numbers.map((_, i) => i + 1));
});

describe.each(files)('%s', (file) => {
	const level: LevelData = JSON.parse(readFileSync(`db/seeds/levels/${file}`, 'utf8'));
	const board = boardFromLevel(level.data);
	const restricted = restrictedElements(board.types);

	it('has a valid number and stage', () => {
		expect(Number.isInteger(level.number) && level.number >= 1).toBe(true);
		expect(Number.isInteger(level.stage) && level.stage >= 1).toBe(true);
	});

	it('matches the capacity the solver assumes', () => {
		expect(level.data.maxPerPlatform).toBe(MAX_PER_PLATFORM);
		for (const stack of board.stacks) {
			expect(stack.length).toBeLessThanOrEqual(level.data.maxPerPlatform);
		}
	});

	it('has element counts that fill whole platforms', () => {
		// Every present element must be completable: its count has to fill
		// platforms exactly (a multiple of the capacity). Zero is fine — not
		// every level uses all four elements.
		const all = board.stacks.flat();
		for (const element of ELEMENTS) {
			const count = all.filter((s) => s.element === element).length;
			expect(count % MAX_PER_PLATFORM).toBe(0);
		}
	});

	it('starts restricted platforms with their own element', () => {
		for (const platform of level.data.platforms) {
			if (platform.type === 'neutral') continue;
			expect(platform.elements[0]).toBe(platform.type);
		}
	});

	it('keeps hidden elements covered', () => {
		for (const platform of level.data.platforms) {
			for (const h of platform.hidden ?? []) {
				expect(Number.isInteger(h)).toBe(true);
				expect(h).toBeGreaterThanOrEqual(0);
				// The bottom of a rope is always revealed, so hidden elements
				// must have something below them.
				expect(h).toBeLessThan(platform.elements.length - 1);
			}
		}
	});

	it('keeps stone-secret platforms neutral and non-empty', () => {
		for (const platform of level.data.platforms) {
			if (!platform.stoneSecret) continue;
			expect(platform.type).toBe('neutral');
			expect(platform.elements.length).toBeGreaterThan(0);
		}
	});

	it('does not start won or with a completed platform', () => {
		expect(isWon(board.stacks, board.types, restricted)).toBe(false);
		for (let i = 0; i < board.stacks.length; i++) {
			expect(isComplete(board.stacks[i], board.types[i], restricted)).toBe(false);
		}
	});

	it('is solvable', () => {
		expect(solve(board)).toBeGreaterThan(0);
	});
});
