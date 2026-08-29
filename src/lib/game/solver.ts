/**
 * Rule-complete solver for levels, shared by the generator, the verification
 * script and the seed tests. Must mirror src/lib/game/engine.svelte.ts.
 *
 * Hidden (mystery) elements are modeled with `revealed: false`: they can't be
 * picked and get revealed when they become the bottom of their rope. The
 * solver knows their true identity — the player can reach the same line with
 * undo/restart, so solver-solvable is what "solvable" means here.
 *
 * Vaults (`lock`) start their whole rope hidden, same as a stone. They open
 * once the matching-colour key is the exposed bottom of any rope. A keyed
 * element (and everything above it) can't be picked until its vault opens.
 */
import type { Element, ElementSlot, KeyColor, LevelGameData, PlatformType } from './types';

export const MAX_PER_PLATFORM = 4;

export type Stack = ElementSlot[];

export interface Board {
	types: PlatformType[];
	stacks: Stack[];
	/** Per platform, the element that must be completed elsewhere to break its stone seal. */
	stoneSecret: (Element | null)[];
	/** Per platform, the colour of the vault sealing it, if any. */
	lock: (KeyColor | null)[];
	/** Per platform, indexes that stay hidden as an ordinary mystery even after a stone/vault opens. */
	hidden: number[][];
}

export function boardFromLevel(data: LevelGameData): Board {
	return {
		types: data.platforms.map((p) => p.type),
		stoneSecret: data.platforms.map((p) => p.stoneSecret ?? null),
		lock: data.platforms.map((p) => p.lock ?? null),
		hidden: data.platforms.map((p) => p.hidden ?? []),
		stacks: data.platforms.map((p) => {
			const slots: Stack = p.elements.map((element, i) => ({
				element,
				// Stone-sealed and vault-locked ropes start fully hidden, bottom
				// included; otherwise the bottom of a rope is always revealed.
				revealed:
					p.stoneSecret || p.lock ? false : !p.hidden?.includes(i) || i === p.elements.length - 1
			}));
			for (const k of p.keys ?? []) if (slots[k.index]) slots[k.index].key = k.color;
			return slots;
		})
	};
}

// The bottom slot is the sealed/broken tell: a stone or a vault forces it
// hidden too, and opening always reveals it, so a covered rope can't be
// confused with a residual ordinary mystery elsewhere on the same platform.
function isCovered(stack: Stack, stoneNeed: Element | null, lock: KeyColor | null): boolean {
	if (stoneNeed === null && lock === null) return false;
	const bottom = stack[stack.length - 1];
	return bottom !== undefined && !bottom.revealed;
}

/** True while a vault of `color` is still sealed somewhere (its rope's bottom hidden). */
function vaultSealed(stacks: Stack[], lock: (KeyColor | null)[], color: KeyColor): boolean {
	return stacks.some((s, i) => lock[i] === color && s[s.length - 1] !== undefined && !s[s.length - 1].revealed);
}

/** Breaks any stone seal whose required element just got completed on another platform. */
function breakStones(
	stacks: Stack[],
	types: PlatformType[],
	stoneSecret: (Element | null)[],
	hidden: number[][],
	restricted: Set<Element>
): { stacks: Stack[]; changed: boolean } {
	let changed = false;
	const next = stacks.map((stack, i) => {
		const need = stoneSecret[i];
		if (need === null || !isCovered(stack, need, null)) return stack;
		const satisfied = stacks.some(
			(s, j) => j !== i && isComplete(s, types[j], restricted) && s[0].element === need
		);
		if (!satisfied) return stack;
		changed = true;
		const own = new Set(hidden[i]);
		const last = stack.length - 1;
		return stack.map((s, idx) => ({ ...s, revealed: !own.has(idx) || idx === last }));
	});
	return { stacks: next, changed };
}

/** Opens any vault whose matching key is the exposed bottom of some rope. */
function openVaults(
	stacks: Stack[],
	lock: (KeyColor | null)[],
	hidden: number[][]
): { stacks: Stack[]; changed: boolean } {
	let changed = false;
	const next = stacks.map((stack, i) => {
		const color = lock[i];
		if (color === null || !isCovered(stack, null, color)) return stack;
		const freed = stacks.some((s) => {
			const b = s[s.length - 1];
			return b !== undefined && b.revealed && b.key === color;
		});
		if (!freed) return stack;
		changed = true;
		const own = new Set(hidden[i]);
		const last = stack.length - 1;
		return stack.map((s, idx) => ({ ...s, revealed: !own.has(idx) || idx === last }));
	});
	return { stacks: next, changed };
}

/** Runs stone breaks and vault opens to a fixed point (each can trigger the other). */
function resolve(
	stacks: Stack[],
	types: PlatformType[],
	stoneSecret: (Element | null)[],
	lock: (KeyColor | null)[],
	hidden: number[][],
	restricted: Set<Element>
): Stack[] {
	let current = stacks;
	for (let guard = 0; guard < 8; guard++) {
		const stones = breakStones(current, types, stoneSecret, hidden, restricted);
		current = stones.stacks;
		const vaults = openVaults(current, lock, hidden);
		current = vaults.stacks;
		if (!stones.changed && !vaults.changed) break;
	}
	return current;
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
	// each type group to shrink the search space. Hidden state and key markers
	// are part of the key: a revealed element moves, a hidden one doesn't, and
	// a keyed element is frozen until its vault opens.
	return stacks
		.map(
			(s, i) =>
				`${types[i]}:${s
					.map((c) => `${c.revealed ? '' : '?'}${c.element}${c.key ? `K${c.key}` : ''}`)
					.join(',')}`
		)
		.sort()
		.join('|');
}

/** A mystery at the bottom of a rope gets revealed. */
function reveal(stack: Stack): Stack {
	const last = stack[stack.length - 1];
	if (!last || last.revealed) return stack;
	return [...stack.slice(0, -1), { element: last.element, revealed: true, ...(last.key ? { key: last.key } : {}) }];
}

/** All legal moves: [from, pickIndex, to]. */
export function legalMoves(
	stacks: Stack[],
	types: PlatformType[],
	restricted: Set<Element>,
	stoneSecret: (Element | null)[],
	lock: (KeyColor | null)[]
): [number, number, number][] {
	const moves: [number, number, number][] = [];
	for (let from = 0; from < stacks.length; from++) {
		const stack = stacks[from];
		if (stack.length === 0 || isComplete(stack, types[from], restricted)) continue;
		// A covered rope (stone or vault) can't be picked from.
		if (!stack[stack.length - 1].revealed) continue;
		const bottom = stack[stack.length - 1].element;
		// Pickable groups are suffixes of the bottom revealed single-element run,
		// above any locked run at the top.
		let runStart = stack.length - 1;
		while (runStart > 0 && stack[runStart - 1].revealed && stack[runStart - 1].element === bottom) {
			runStart--;
		}
		runStart = Math.max(runStart, lockedCount(stack, types[from]));
		// Can't lift a group that contains a key whose vault is still sealed —
		// that pins the key (and everything above it) in place.
		let keyFloor = 0;
		for (let idx = 0; idx < stack.length; idx++) {
			if (stack[idx].key && vaultSealed(stacks, lock, stack[idx].key!)) keyFloor = idx + 1;
		}
		runStart = Math.max(runStart, keyFloor);
		for (let index = runStart; index < stack.length; index++) {
			const count = stack.length - index;
			for (let to = 0; to < stacks.length; to++) {
				if (to === from) continue;
				if (isCovered(stacks[to], stoneSecret[to], lock[to])) continue;
				const target = stacks[to];
				if (target.length + count > MAX_PER_PLATFORM) continue;
				if (isComplete(target, types[to], restricted)) continue;
				const targetBottom = target[target.length - 1];
				// Can't cover a key that still needs to reach a bottom.
				if (targetBottom && targetBottom.key && vaultSealed(stacks, lock, targetBottom.key)) continue;
				if (target.length === 0) {
					// A restricted platform's first element must be its own.
					if (types[to] !== 'neutral' && types[to] !== bottom) continue;
				} else if (targetBottom.element !== bottom) {
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
	const start = resolve(
		board.stacks,
		board.types,
		board.stoneSecret,
		board.lock,
		board.hidden,
		restricted
	);

	function dfs(stacks: Stack[], depth: number): number {
		if (isWon(stacks, board.types, restricted)) return depth;
		if (depth >= limit) return -1;
		const key = stateKey(stacks, board.types);
		if (visited.has(key)) return -1;
		visited.add(key);

		for (const [from, index, to] of legalMoves(
			stacks,
			board.types,
			restricted,
			board.stoneSecret,
			board.lock
		)) {
			let next = stacks.map((s) => [...s]);
			const group = next[from].splice(index);
			next[from] = reveal(next[from]);
			next[to].push(...group);
			next = resolve(next, board.types, board.stoneSecret, board.lock, board.hidden, restricted);
			const result = dfs(next, depth + 1);
			if (result !== -1) return result;
		}
		return -1;
	}

	return dfs(start, 0);
}

/** One committed move, in the shape the engine records its history. */
export interface SolutionMove {
	from: number;
	to: number;
	count: number;
}

/** Like `solve`, but returns the actual moves (engine-history shape), or null. */
export function solvePath(board: Board): SolutionMove[] | null {
	const visited = new Set<string>();
	const limit = 80;
	const restricted = restrictedElements(board.types);
	const start = resolve(
		board.stacks,
		board.types,
		board.stoneSecret,
		board.lock,
		board.hidden,
		restricted
	);

	function dfs(stacks: Stack[], depth: number): SolutionMove[] | null {
		if (isWon(stacks, board.types, restricted)) return [];
		if (depth >= limit) return null;
		const key = stateKey(stacks, board.types);
		if (visited.has(key)) return null;
		visited.add(key);

		for (const [from, index, to] of legalMoves(
			stacks,
			board.types,
			restricted,
			board.stoneSecret,
			board.lock
		)) {
			let next = stacks.map((s) => [...s]);
			const group = next[from].splice(index);
			next[from] = reveal(next[from]);
			next[to].push(...group);
			next = resolve(next, board.types, board.stoneSecret, board.lock, board.hidden, restricted);
			const rest = dfs(next, depth + 1);
			if (rest) return [{ from, to, count: stacks[from].length - index }, ...rest];
		}
		return null;
	}

	return dfs(start, 0);
}

/** The board's opening position, with stone/vault seals resolved. */
export function initialState(board: Board): Stack[] {
	return resolve(
		board.stacks.map((s) => [...s]),
		board.types,
		board.stoneSecret,
		board.lock,
		board.hidden,
		restrictedElements(board.types)
	);
}

/**
 * Applies one committed move (engine-history shape) to a board state, returning
 * the next stacks, or null if the move is illegal. Seals resolve after it.
 */
export function applyMove(board: Board, stacks: Stack[], move: SolutionMove): Stack[] | null {
	if (
		!move ||
		!Number.isInteger(move.from) ||
		!Number.isInteger(move.to) ||
		!Number.isInteger(move.count) ||
		move.count < 1 ||
		move.from < 0 ||
		move.from >= stacks.length ||
		move.to < 0 ||
		move.to >= stacks.length
	) {
		return null;
	}
	const restricted = restrictedElements(board.types);
	// The engine records the group size; the pick index is whatever leaves
	// exactly that many pieces below it at the time of the move.
	const index = stacks[move.from].length - move.count;
	if (index < 0) return null;
	const legal = legalMoves(stacks, board.types, restricted, board.stoneSecret, board.lock).some(
		([f, i, t]) => f === move.from && i === index && t === move.to
	);
	if (!legal) return null;

	const next = stacks.map((s) => [...s]);
	const group = next[move.from].splice(index);
	next[move.from] = reveal(next[move.from]);
	next[move.to].push(...group);
	return resolve(next, board.types, board.stoneSecret, board.lock, board.hidden, restricted);
}

/**
 * Replays a player's committed moves on a fresh board and returns how many
 * moves it took to win, or null if any move is illegal or the sequence doesn't
 * reach a win. The server calls this to accept a level completion — the client
 * is never trusted to say it solved a level.
 */
export function replaySolution(board: Board, moves: readonly SolutionMove[]): number | null {
	if (!Array.isArray(moves) || moves.length === 0 || moves.length > 1000) return null;
	let stacks: Stack[] | null = initialState(board);
	for (const move of moves) {
		stacks = applyMove(board, stacks, move);
		if (stacks === null) return null;
	}
	return isWon(stacks, board.types, restrictedElements(board.types)) ? moves.length : null;
}
