/**
 * Generates a random, guaranteed-solvable phase JSON and writes it to
 * static/phases/<id>.json. Run with:
 *
 *   bun scripts/generate-phase.ts [id] [name] [seed] [restrictedCount]
 */
import { ELEMENTS, type Element, type PhaseData, type PlatformType } from '../src/lib/game/types';
import {
	MAX_PER_PLATFORM,
	type Level,
	type Stack,
	isComplete,
	isWon,
	restrictedElements,
	solve
} from './solver';

const PLATFORM_COUNT = 5;
const MIN_SOLUTION_MOVES = 6;

function mulberry32(seed: number): () => number {
	let a = seed >>> 0;
	return () => {
		a |= 0;
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

function shuffle<T>(items: T[], rand: () => number): T[] {
	const result = [...items];
	for (let i = result.length - 1; i > 0; i--) {
		const j = Math.floor(rand() * (i + 1));
		[result[i], result[j]] = [result[j], result[i]];
	}
	return result;
}

function randomLevel(rand: () => number, restrictedCount: number): Level {
	// `restrictedCount` platforms are locked to distinct random elements, the rest are neutral.
	const types: PlatformType[] = Array(PLATFORM_COUNT).fill('neutral');
	const platformOrder = shuffle([...types.keys()], rand);
	const elementOrder = shuffle([...ELEMENTS], rand);
	for (let i = 0; i < restrictedCount; i++) {
		types[platformOrder[i]] = elementOrder[i];
	}

	// Restricted platforms always start with their own element on top, matching
	// the rule that their first sphere must be their element.
	const pool: Element[] = ELEMENTS.flatMap((e) => [e, e, e, e]);
	const stacks: Stack[] = types.map(() => []);
	for (let i = 0; i < PLATFORM_COUNT; i++) {
		const type = types[i];
		if (type === 'neutral') continue;
		pool.splice(pool.indexOf(type), 1);
		stacks[i].push(type);
	}

	// Scatter the rest anywhere with room.
	for (const sphere of shuffle(pool, rand)) {
		let i = Math.floor(rand() * PLATFORM_COUNT);
		while (stacks[i].length >= MAX_PER_PLATFORM) {
			i = (i + 1) % PLATFORM_COUNT;
		}
		stacks[i].push(sphere);
	}
	return { types, stacks };
}

function generate(
	seed: number,
	restrictedCount: number
): { level: Level; seed: number; solutionMoves: number } {
	for (let attempt = 0; attempt < 10000; attempt++) {
		// Attempts get their own stream per seed so nearby seeds don't converge
		// on the same level.
		const rand = mulberry32(seed * 10000 + attempt);
		const level = randomLevel(rand, restrictedCount);
		const restricted = restrictedElements(level.types);
		if (isWon(level.stacks, level.types, restricted)) continue;
		if (level.stacks.some((s, i) => isComplete(s, level.types[i], restricted))) continue; // no freebies at the start
		const solutionMoves = solve(level);
		if (solutionMoves < MIN_SOLUTION_MOVES) continue;
		return { level, seed, solutionMoves };
	}
	throw new Error('Could not generate a solvable level');
}

const id = process.argv[2] ?? 'phase-1';
const name = process.argv[3] ?? 'First Steps';
const seed = process.argv[4] ? Number(process.argv[4]) : Math.floor(Math.random() * 1e9);
const restrictedCount = process.argv[5] ? Number(process.argv[5]) : 1;
if (restrictedCount < 0 || restrictedCount > ELEMENTS.length) {
	throw new Error(`restrictedCount must be between 0 and ${ELEMENTS.length}`);
}

const { level, seed: usedSeed, solutionMoves } = generate(seed, restrictedCount);

const phase: PhaseData = {
	id,
	name,
	maxPerPlatform: MAX_PER_PLATFORM,
	platforms: level.types.map((type, i) => ({ type, spheres: level.stacks[i] }))
};

const path = `static/phases/${id}.json`;
await Bun.write(path, JSON.stringify(phase, null, '\t') + '\n');
console.log(`Wrote ${path} (seed ${usedSeed}, solvable in <= ${solutionMoves} moves)`);
console.log(JSON.stringify(phase.platforms, null, 2));
