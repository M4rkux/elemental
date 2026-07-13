/**
 * Rule-complete solver for phases, shared by the generator and the
 * verification script. Must mirror src/lib/game/engine.svelte.ts.
 */
import type { Element, PhaseData, PlatformType } from '../src/lib/game/types';

export const MAX_PER_PLATFORM = 4;

export type Stack = Element[];

export interface Level {
	types: PlatformType[];
	stacks: Stack[];
}

export function levelFromPhase(phase: PhaseData): Level {
	return {
		types: phase.platforms.map((p) => p.type),
		stacks: phase.platforms.map((p) => [...p.spheres])
	};
}

export function restrictedElements(types: PlatformType[]): Set<Element> {
	return new Set(types.filter((t): t is Element => t !== 'neutral'));
}

/** Run of a restricted platform's own element from the top; locked in place. */
export function lockedCount(stack: Stack, type: PlatformType): number {
	if (type === 'neutral') return 0;
	let count = 0;
	while (count < stack.length && stack[count] === type) count++;
	return count;
}

export function isComplete(stack: Stack, type: PlatformType, restricted: Set<Element>): boolean {
	if (stack.length !== MAX_PER_PLATFORM) return false;
	const element = stack[0];
	if (!stack.every((s) => s === element)) return false;
	// A restricted element only completes on its own platform.
	return type === 'neutral' ? !restricted.has(element) : type === element;
}

export function isWon(stacks: Stack[], types: PlatformType[], restricted: Set<Element>): boolean {
	return stacks.every((s, i) => s.length === 0 || isComplete(s, types[i], restricted));
}

function stateKey(stacks: Stack[], types: PlatformType[]): string {
	// Platforms with the same restriction are interchangeable, so sort within
	// each type group to shrink the search space.
	return stacks
		.map((s, i) => `${types[i]}:${s.join(',')}`)
		.sort()
		.join('|');
}

/** All legal moves: [from, pickIndex, to]. */
export function legalMoves(
	stacks: Stack[],
	types: PlatformType[],
	restricted: Set<Element>
): [number, number, number][] {
	const moves: [number, number, number][] = [];
	for (let from = 0; from < stacks.length; from++) {
		const stack = stacks[from];
		if (stack.length === 0 || isComplete(stack, types[from], restricted)) continue;
		const bottom = stack[stack.length - 1];
		// Pickable groups are suffixes of the bottom single-element run, above
		// any locked run at the top.
		let runStart = stack.length - 1;
		while (runStart > 0 && stack[runStart - 1] === bottom) runStart--;
		runStart = Math.max(runStart, lockedCount(stack, types[from]));
		for (let index = runStart; index < stack.length; index++) {
			const count = stack.length - index;
			for (let to = 0; to < stacks.length; to++) {
				if (to === from) continue;
				const target = stacks[to];
				if (target.length + count > MAX_PER_PLATFORM) continue;
				if (isComplete(target, types[to], restricted)) continue;
				if (target.length === 0) {
					// A restricted platform's first sphere must be its own element.
					if (types[to] !== 'neutral' && types[to] !== bottom) continue;
				} else if (target[target.length - 1] !== bottom) {
					continue;
				}
				moves.push([from, index, to]);
			}
		}
	}
	return moves;
}

/** Depth-first search with memoization; returns the number of moves in a found solution, or -1. */
export function solve(level: Level): number {
	const visited = new Set<string>();
	const limit = 80;
	const restricted = restrictedElements(level.types);

	function dfs(stacks: Stack[], depth: number): number {
		if (isWon(stacks, level.types, restricted)) return depth;
		if (depth >= limit) return -1;
		const key = stateKey(stacks, level.types);
		if (visited.has(key)) return -1;
		visited.add(key);

		for (const [from, index, to] of legalMoves(stacks, level.types, restricted)) {
			const next = stacks.map((s) => [...s]);
			const group = next[from].splice(index);
			next[to].push(...group);
			const result = dfs(next, depth + 1);
			if (result !== -1) return result;
		}
		return -1;
	}

	return dfs(level.stacks, 0);
}
