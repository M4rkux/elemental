import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'fs';
import { GameEngine } from './engine.svelte';
import { boardFromLevel, legalMoves, replaySolution, restrictedElements, solvePath } from './solver';
import type { LevelData } from './types';

const files = readdirSync('db/seeds/levels')
	.filter((f) => f.endsWith('.json'))
	.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

describe.each(files)('%s', (file) => {
	const level: LevelData = JSON.parse(readFileSync(`db/seeds/levels/${file}`, 'utf8'));

	it('engine reaches the win state and the server accepts its solution', () => {
		const path = solvePath(boardFromLevel(level.data))!;
		const e = new GameEngine(level);
		for (const m of path) {
			const index = e.platforms[m.from].length - m.count;
			expect(e.move(m.from, index, m.to)).toBe(true);
		}
		expect(e.won).toBe(true);
		expect(replaySolution(boardFromLevel(level.data), e.solution)).toBe(e.solution.length);
	});

	it('every legal engine move is a legal solver move (100 random walks)', () => {
		const board = boardFromLevel(level.data);
		const restricted = restrictedElements(board.types);
		for (let walk = 0; walk < 100; walk++) {
			const e = new GameEngine(level);
			for (let step = 0; step < 60 && !e.won; step++) {
				// enumerate engine-legal moves
				const engineMoves: [number, number, number][] = [];
				for (let from = 0; from < e.platforms.length; from++) {
					for (let i = 0; i < e.platforms[from].length; i++) {
						if (!e.canPick(from, i)) continue;
						const group = e.groupAt(from, i);
						for (let to = 0; to < e.platforms.length; to++) {
							if (to === from) continue;
							if (e.canDrop(to, group[0], group.length)) engineMoves.push([from, i, to]);
						}
					}
				}
				if (engineMoves.length === 0) break;
				// snapshot solver-legal set from the same position
				const solverLegal = new Set(
					legalMoves(
						e.platforms.map((s) => s.map((c) => ({ ...c }))),
						board.types,
						restricted,
						board.stoneSecret,
						board.lock
					).map(([f, i, t]) => `${f},${i},${t}`)
				);
				for (const [f, i, t] of engineMoves) {
					expect(solverLegal.has(`${f},${i},${t}`), `${file} walk ${walk}: engine allows ${f},${i},${t} but solver doesn't`).toBe(true);
				}
				const [f, i, t] = engineMoves[Math.floor(Math.random() * engineMoves.length)];
				e.move(f, i, t);
			}
		}
	});
});
