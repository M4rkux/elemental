import { describe, expect, it } from 'vitest';
import type { LevelGameData } from '../src/lib/game/types';
import {
	boardFromLevel,
	legalMoves,
	replaySolution,
	restrictedElements,
	solve,
	solvePath
} from '../src/lib/game/solver';

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

	it('solvePath agrees with solve on a chained key/vault board', () => {
		// Freeing the c-key (p0) opens vault c (p1), exposing the a-key inside it;
		// that opens vault a (p2), exposing the b-key; that opens vault b (p3).
		const data: LevelGameData = {
			maxPerPlatform: 4,
			platforms: [
				{ type: 'neutral', elements: ['fire', 'earth'], keys: [{ index: 0, color: 'c' }] },
				{
					type: 'neutral',
					elements: ['water', 'earth', 'water', 'water'],
					lock: 'c',
					keys: [{ index: 1, color: 'a' }]
				},
				{
					type: 'neutral',
					elements: ['air', 'fire', 'air', 'air'],
					lock: 'a',
					keys: [{ index: 1, color: 'b' }]
				},
				{ type: 'neutral', elements: ['earth', 'earth'], lock: 'b' },
				{ type: 'neutral', elements: ['fire', 'water', 'air'] },
				{ type: 'neutral', elements: ['water', 'air', 'fire', 'earth'] }
			]
		};
		const path = solvePath(boardFromLevel(data));
		const len = solve(boardFromLevel(data));
		if (len === -1) {
			expect(path).toBeNull();
		} else {
			expect(path).not.toBeNull();
			expect(path!.length).toBe(len);
			// The server-side check must accept the solver's own solution...
			expect(replaySolution(boardFromLevel(data), path!)).toBe(len);
		}
	});

	it('replaySolution rejects tampered or losing move sequences', () => {
		const board = () => boardFromLevel(KEYED);
		expect(replaySolution(board(), [])).toBeNull();
		expect(replaySolution(board(), [{ from: 0, to: 1, count: 1 }])).toBeNull(); // p1 is a sealed vault
		expect(replaySolution(board(), [{ from: 0, to: 2, count: 1 }])).toBeNull(); // legal move, but doesn't win
		// A garbage move: out-of-range platform.
		expect(replaySolution(board(), [{ from: 9, to: 2, count: 1 }])).toBeNull();
	});
});
