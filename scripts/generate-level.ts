/**
 * Generates a random, guaranteed-solvable level seed JSON and writes it to
 * db/seeds/levels/level-<number>.json. Run with:
 *
 *   bun scripts/generate-level.ts <number> <name> [seed] [restrictedCount] [stage] [mysteryCount]
 *
 * `stage` defaults to ceil(number / 10): stage 1 holds levels 1–10, and so on.
 * `mysteryCount` elements start hidden; they are placed on neutral platforms,
 * always covered by at least one element below.
 */
import {
	ELEMENTS,
	type Element,
	type LevelData,
	type PlatformData,
	type PlatformType
} from '../src/lib/game/types';
import {
	MAX_PER_PLATFORM,
	type Board,
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

function randomPlatforms(
	rand: () => number,
	restrictedCount: number,
	mysteryCount: number
): PlatformData[] | null {
	// `restrictedCount` platforms are locked to distinct random elements, the rest are neutral.
	const types: PlatformType[] = Array(PLATFORM_COUNT).fill('neutral');
	const platformOrder = shuffle([...types.keys()], rand);
	const elementOrder = shuffle([...ELEMENTS], rand);
	for (let i = 0; i < restrictedCount; i++) {
		types[platformOrder[i]] = elementOrder[i];
	}

	// Restricted platforms always start with their own element on top, matching
	// the rule that their first element must be their own.
	const pool: Element[] = ELEMENTS.flatMap((e) => [e, e, e, e]);
	const stacks: Element[][] = types.map(() => []);
	for (let i = 0; i < PLATFORM_COUNT; i++) {
		const type = types[i];
		if (type === 'neutral') continue;
		pool.splice(pool.indexOf(type), 1);
		stacks[i].push(type);
	}

	// Scatter the rest anywhere with room.
	for (const element of shuffle(pool, rand)) {
		let i = Math.floor(rand() * PLATFORM_COUNT);
		while (stacks[i].length >= MAX_PER_PLATFORM) {
			i = (i + 1) % PLATFORM_COUNT;
		}
		stacks[i].push(element);
	}

	// Hidden elements go on neutral platforms and must be covered by at least
	// one element below (the bottom of a rope is always revealed).
	const candidates: [number, number][] = [];
	for (let i = 0; i < PLATFORM_COUNT; i++) {
		if (types[i] !== 'neutral') continue;
		for (let p = 0; p < stacks[i].length - 1; p++) candidates.push([i, p]);
	}
	if (candidates.length < mysteryCount) return null;
	const hidden: number[][] = types.map(() => []);
	for (const [i, p] of shuffle(candidates, rand).slice(0, mysteryCount)) {
		hidden[i].push(p);
	}

	return types.map((type, i) => ({
		type,
		elements: stacks[i],
		...(hidden[i].length > 0 ? { hidden: hidden[i].sort((a, b) => a - b) } : {})
	}));
}

function generate(
	seed: number,
	restrictedCount: number,
	mysteryCount: number
): { platforms: PlatformData[]; seed: number; solutionMoves: number } {
	for (let attempt = 0; attempt < 10000; attempt++) {
		// Attempts get their own stream per seed so nearby seeds don't converge
		// on the same board.
		const rand = mulberry32(seed * 10000 + attempt);
		const platforms = randomPlatforms(rand, restrictedCount, mysteryCount);
		if (!platforms) continue;
		const board: Board = {
			types: platforms.map((p) => p.type),
			stacks: platforms.map((p) =>
				p.elements.map((element, i) => ({ element, revealed: !p.hidden?.includes(i) }))
			)
		};
		const restricted = restrictedElements(board.types);
		if (isWon(board.stacks, board.types, restricted)) continue;
		if (board.stacks.some((s, i) => isComplete(s, board.types[i], restricted))) continue; // no freebies at the start
		const solutionMoves = solve(board);
		if (solutionMoves < MIN_SOLUTION_MOVES) continue;
		return { platforms, seed, solutionMoves };
	}
	throw new Error('Could not generate a solvable level');
}

const number = process.argv[2] ? Number(process.argv[2]) : 1;
if (!Number.isInteger(number) || number < 1) {
	throw new Error('number must be a positive integer');
}
const name = process.argv[3] ?? 'First Steps';
const seed = process.argv[4] ? Number(process.argv[4]) : Math.floor(Math.random() * 1e9);
const restrictedCount = process.argv[5] ? Number(process.argv[5]) : 1;
if (restrictedCount < 0 || restrictedCount > ELEMENTS.length) {
	throw new Error(`restrictedCount must be between 0 and ${ELEMENTS.length}`);
}
const stage = process.argv[6] ? Number(process.argv[6]) : Math.ceil(number / 10);
const mysteryCount = process.argv[7] ? Number(process.argv[7]) : 0;
if (mysteryCount < 0) throw new Error('mysteryCount must be >= 0');

const { platforms, seed: usedSeed, solutionMoves } = generate(seed, restrictedCount, mysteryCount);

const level: LevelData = {
	number,
	stage,
	name,
	data: {
		maxPerPlatform: MAX_PER_PLATFORM,
		platforms
	}
};

const path = `db/seeds/levels/level-${number}.json`;
await Bun.write(path, JSON.stringify(level, null, '\t') + '\n');
console.log(`Wrote ${path} (seed ${usedSeed}, solvable in <= ${solutionMoves} moves)`);
console.log(JSON.stringify(level.data.platforms, null, 2));
