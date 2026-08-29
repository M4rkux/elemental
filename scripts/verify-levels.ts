/**
 * Checks every level seed JSON in db/seeds/levels/ against the game rules:
 * solvable, not already won, no completed platform at the start, element
 * counts intact, restricted platforms starting with their own element, hidden
 * (mystery) elements always covered, and keys/vaults well-formed.
 *
 *   bun scripts/verify-levels.ts
 */
import { readdirSync } from 'fs';
import { ELEMENTS, KEY_COLORS, type LevelData } from '../src/lib/game/types';
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

let failures = 0;

for (const file of files) {
	const level: LevelData = await Bun.file(`db/seeds/levels/${file}`).json();
	const board = boardFromLevel(level.data);
	const restricted = restrictedElements(board.types);
	const problems: string[] = [];

	if (level.data.maxPerPlatform !== MAX_PER_PLATFORM) {
		problems.push(
			`maxPerPlatform is ${level.data.maxPerPlatform}, solver assumes ${MAX_PER_PLATFORM}`
		);
	}
	for (const element of ELEMENTS) {
		const count = board.stacks.flat().filter((s) => s.element === element).length;
		// Every present element must fill platforms exactly; zero is fine.
		if (count % MAX_PER_PLATFORM !== 0) {
			problems.push(`${element} appears ${count} times, not a multiple of ${MAX_PER_PLATFORM}`);
		}
	}
	for (let i = 0; i < level.data.platforms.length; i++) {
		const platform = level.data.platforms[i];
		if (platform.elements.length > level.data.maxPerPlatform) {
			problems.push(`platform ${i} starts over capacity`);
		}
		if (platform.type !== 'neutral' && platform.elements[0] !== platform.type) {
			problems.push(`${platform.type} platform starts with ${platform.elements[0] ?? 'nothing'}`);
		}
		for (const h of platform.hidden ?? []) {
			if (!Number.isInteger(h) || h < 0 || h >= platform.elements.length - 1) {
				problems.push(`platform ${i} hidden index ${h} is not a covered element`);
			} else if (platform.elements[h] === platform.elements[h + 1]) {
				problems.push(
					`platform ${i} hidden ${platform.elements[h]} at ${h} sits directly on its own element`
				);
			}
		}
		if (platform.stoneSecret && platform.type !== 'neutral') {
			problems.push(`platform ${i} stoneSecret on a restricted platform`);
		}
		if (platform.stoneSecret && platform.elements.length === 0) {
			problems.push(`platform ${i} is a stone sealing nothing`);
		}
		if (platform.lock) {
			if (!KEY_COLORS.includes(platform.lock)) problems.push(`platform ${i} lock colour ${platform.lock} unknown`);
			if (platform.type !== 'neutral') problems.push(`platform ${i} lock on a restricted platform`);
			if (platform.elements.length === 0) problems.push(`platform ${i} is a vault sealing nothing`);
			if (platform.stoneSecret) problems.push(`platform ${i} has both a stone and a vault`);
			if (platform.keys?.length) problems.push(`platform ${i} is both locked and holds a key`);
		}
		for (const k of platform.keys ?? []) {
			if (!KEY_COLORS.includes(k.color)) problems.push(`platform ${i} key colour ${k.color} unknown`);
			if (!Number.isInteger(k.index) || k.index < 0 || k.index >= platform.elements.length - 1) {
				problems.push(`platform ${i} key index ${k.index} is not a covered, non-bottom element`);
			} else if (platform.elements[k.index] === platform.elements[k.index + 1]) {
				problems.push(`platform ${i} key at ${k.index} sits directly on its own element`);
			}
			if (platform.stoneSecret || platform.lock) {
				problems.push(`platform ${i} key on a covered platform`);
			}
		}
	}

	// Keys and vaults must pair up one-for-one by colour.
	const keyColors = level.data.platforms.flatMap((p) => (p.keys ?? []).map((k) => k.color));
	const lockColors = level.data.platforms.map((p) => p.lock).filter((c): c is (typeof KEY_COLORS)[number] => !!c);
	for (const color of KEY_COLORS) {
		const nk = keyColors.filter((c) => c === color).length;
		const nl = lockColors.filter((c) => c === color).length;
		if (nk !== nl) problems.push(`colour ${color}: ${nk} key(s) but ${nl} vault(s)`);
	}
	if (isWon(board.stacks, board.types, restricted)) problems.push('already won at start');
	if (board.stacks.some((s, i) => isComplete(s, board.types[i], restricted))) {
		problems.push('a platform starts complete');
	}

	const moves = problems.length === 0 ? solve(board) : -1;
	if (problems.length === 0 && moves === -1) problems.push('NOT SOLVABLE');

	if (problems.length > 0) {
		failures++;
		console.log(`✗ ${file}: ${problems.join('; ')}`);
	} else {
		console.log(`✓ ${file} (${level.name}) solvable in <= ${moves} moves`);
	}
}

if (failures > 0) {
	console.log(`\n${failures} of ${files.length} levels failed`);
	process.exit(1);
}
console.log(`\nAll ${files.length} levels OK`);
