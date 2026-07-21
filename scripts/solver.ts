/**
 * Rule-complete solver for levels, shared by the generator, the verification
 * script and the seed tests. Must mirror src/lib/game/engine.svelte.ts.
 *
 * Hidden (mystery) elements are modeled with `revealed: false`: they can't be
 * picked and get revealed when they become the bottom of their rope. The
 * solver knows their true identity — the player can reach the same line with
 * undo/restart, so solver-solvable is what "solvable" means here.
 */
import type { Element, ElementSlot, LevelGameData, PlatformType } from '../src/lib/game/types';

export const MAX_PER_PLATFORM = 4;

export type Stack = ElementSlot[];

export interface Board {
	types: PlatformType[];
	stacks: Stack[];
	/** Per platform, the element that must be completed elsewhere to break its stone seal. */
	stoneSecret: (Element | null)[];
}

export function boardFromLevel(data: LevelGameData): Board {
	return {
		types: data.platforms.map((p) => p.type),
		stoneSecret: data.platforms.map((p) => p.stoneSecret ?? null),
		stacks: data.platforms.map((p) =>
			p.elements.map((element, i) => ({
				element,
				// Stone-sealed ropes start fully hidden, bottom included; otherwise
				// the bottom of a rope is always revealed, whatever the data says.
				revealed: p.stoneSecret ? false : !p.hidden?.includes(i) || i === p.elements.length - 1
			}))
		)
	};
}

function isSealed(stack: Stack, need: Element | null): boolean {
	return need !== null && stack.some((s) => !s.revealed);
}

/** Breaks any stone seal whose required element just got completed on another platform. */
function breakStones(
	stacks: Stack[],
	types: PlatformType[],
	stoneSecret: (Element | null)[],
	restricted: Set<Element>
): Stack[] {
	return stacks.map((stack, i) => {
		const need = stoneSecret[i];
		if (!isSealed(stack, need)) return stack;
		const satisfied = stacks.some(
			(s, j) => j !== i && isComplete(s, types[j], restricted) && s[0].element === need
		);
		if (!satisfied) return stack;
		return stack.map((s) => ({ ...s, revealed: true }));
	});
}

export function restrictedElements(types: PlatformType[]): Set<Element> {
	return new Set(types.filter((t): t is Element => t !== 'neutral'));
}

/** Run of a restricted platform's own revealed element from the top; locked in place. */
export function lockedCount(stack: Stack, type: PlatformType): number {
	if (type === 'neutral') return 0;
	let count = 0;
	while (count < stack.length && stack[count].revealed && stack[count].element === type) count++;
	return count;
}

export function isComplete(stack: Stack, type: PlatformType, restricted: Set<Element>): boolean {
	if (stack.length !== MAX_PER_PLATFORM) return false;
	const element = stack[0].element;
	if (!stack.every((s) => s.revealed && s.element === element)) return false;
	// A restricted element only completes on its own platform.
	return type === 'neutral' ? !restricted.has(element) : type === element;
}

export function isWon(stacks: Stack[], types: PlatformType[], restricted: Set<Element>): boolean {
	return stacks.every((s, i) => s.length === 0 || isComplete(s, types[i], restricted));
}

function stateKey(stacks: Stack[], types: PlatformType[]): string {
	// Platforms with the same restriction are interchangeable, so sort within
	// each type group to shrink the search space. Hidden state is part of the
	// key: a revealed element moves, a hidden one doesn't.
	return stacks
		.map((s, i) => `${types[i]}:${s.map((c) => (c.revealed ? c.element : `?${c.element}`)).join(',')}`)
		.sort()
		.join('|');
}

/** A mystery at the bottom of a rope gets revealed. */
function reveal(stack: Stack): Stack {
	const last = stack[stack.length - 1];
	if (!last || last.revealed) return stack;
	return [...stack.slice(0, -1), { element: last.element, revealed: true }];
}

/** All legal moves: [from, pickIndex, to]. */
export function legalMoves(
	stacks: Stack[],
	types: PlatformType[],
	restricted: Set<Element>,
	stoneSecret: (Element | null)[]
): [number, number, number][] {
	const moves: [number, number, number][] = [];
	for (let from = 0; from < stacks.length; from++) {
		const stack = stacks[from];
		if (stack.length === 0 || isComplete(stack, types[from], restricted)) continue;
		// A sealed stone (or, in principle, any stack with a hidden bottom) can't be picked from.
		if (!stack[stack.length - 1].revealed) continue;
		const bottom = stack[stack.length - 1].element;
		// Pickable groups are suffixes of the bottom revealed single-element run,
		// above any locked run at the top.
		let runStart = stack.length - 1;
		while (runStart > 0 && stack[runStart - 1].revealed && stack[runStart - 1].element === bottom) {
			runStart--;
		}
		runStart = Math.max(runStart, lockedCount(stack, types[from]));
		for (let index = runStart; index < stack.length; index++) {
			const count = stack.length - index;
			for (let to = 0; to < stacks.length; to++) {
				if (to === from) continue;
				if (isSealed(stacks[to], stoneSecret[to])) continue;
				const target = stacks[to];
				if (target.length + count > MAX_PER_PLATFORM) continue;
				if (isComplete(target, types[to], restricted)) continue;
				if (target.length === 0) {
					// A restricted platform's first element must be its own.
					if (types[to] !== 'neutral' && types[to] !== bottom) continue;
				} else if (target[target.length - 1].element !== bottom) {
					continue;
				}
				moves.push([from, index, to]);
			}
		}
	}
	return moves;
}

/** Depth-first search with memoization; returns the number of moves in a found solution, or -1. */
export function solve(board: Board): number {
	const visited = new Set<string>();
	const limit = 80;
	const restricted = restrictedElements(board.types);

	function dfs(stacks: Stack[], depth: number): number {
		if (isWon(stacks, board.types, restricted)) return depth;
		if (depth >= limit) return -1;
		const key = stateKey(stacks, board.types);
		if (visited.has(key)) return -1;
		visited.add(key);

		for (const [from, index, to] of legalMoves(stacks, board.types, restricted, board.stoneSecret)) {
			let next = stacks.map((s) => [...s]);
			const group = next[from].splice(index);
			next[from] = reveal(next[from]);
			next[to].push(...group);
			next = breakStones(next, board.types, board.stoneSecret, restricted);
			const result = dfs(next, depth + 1);
			if (result !== -1) return result;
		}
		return -1;
	}

	return dfs(board.stacks, 0);
}
