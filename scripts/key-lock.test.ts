import { describe, expect, it } from 'vitest';
import type { LevelGameData } from '../src/lib/game/types';
import { boardFromLevel, legalMoves, restrictedElements, solve } from './solver';

// A tiny winnable board: fire×4, water×4. p0 carries key 'a' on its top fire,
// covered by one water; p1 is the vault of colour 'a'.
const KEYED: LevelGameData = {
	maxPerPlatform: 4,
	platforms: [
		{ type: 'neutral', elements: ['fire', 'water'], keys: [{ index: 0, color: 'a' }] },
		{ type: 'neutral', elements: ['fire', 'fire', 'fire'], lock: 'a' },
		{ type: 'neutral', elements: ['water', 'water', 'water'] },
		{ type: 'neutral', elements: [] }
	]
};

describe('key & vault solver rules', () => {
	it('solves by freeing the key, which opens the vault', () => {
		// water off p0 → p2 completes and p0's keyed fire is exposed → vault opens
		// → the freed fire finishes the vault. Two moves.
		expect(solve(boardFromLevel(KEYED))).toBe(2);
	});

	it('will not lift a group that still contains a sealed key', () => {
		const board = boardFromLevel(KEYED);
		const restricted = restrictedElements(board.types);
		const legal = legalMoves(board.stacks, board.types, restricted, board.stoneSecret, board.lock);
		// Only the water at index 1 can leave p0; the keyed fire at index 0 is pinned.
		const fromP0 = legal.filter(([from]) => from === 0);
		expect(fromP0.length).toBeGreaterThan(0);
		expect(fromP0.every(([, index]) => index === 1)).toBe(true);
	});

	it('never targets a vault-locked platform', () => {
		const board = boardFromLevel(KEYED);
		const restricted = restrictedElements(board.types);
		const legal = legalMoves(board.stacks, board.types, restricted, board.stoneSecret, board.lock);
		expect(legal.some(([, , to]) => to === 1)).toBe(false);
	});

	it('refuses to bury a key sitting at a rope bottom', () => {
		// p0's key fire is the exposed bottom (index 0, nothing below). A stray
		// fire must not be allowed to land on top of it and re-cover it.
		const data: LevelGameData = {
			maxPerPlatform: 4,
			platforms: [
				{ type: 'neutral', elements: ['fire'], keys: [{ index: 0, color: 'a' }] },
				{ type: 'neutral', elements: ['fire', 'fire', 'fire', 'fire'], lock: 'a' },
				{ type: 'neutral', elements: ['fire', 'fire', 'fire'] }
			]
		};
		const board = boardFromLevel(data);
		const restricted = restrictedElements(board.types);
		const legal = legalMoves(board.stacks, board.types, restricted, board.stoneSecret, board.lock);
		expect(legal.some(([, , to]) => to === 0)).toBe(false);
	});

	it('is unsolvable when the key can never be uncovered', () => {
		// The key sits on a restricted air platform under its own locked air run:
		// index 0 air locks from the top, so the keyed slot below it never moves
		// and the vault stays shut.
		const data: LevelGameData = {
			maxPerPlatform: 4,
			platforms: [
				{ type: 'neutral', elements: ['air', 'air', 'air', 'air'], lock: 'a' },
				{ type: 'air', elements: ['air', 'fire'], keys: [{ index: 1, color: 'a' }] },
				{ type: 'neutral', elements: ['fire', 'fire', 'fire'] }
			]
		};
		expect(solve(boardFromLevel(data))).toBe(-1);
	});
});
