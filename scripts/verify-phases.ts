/**
 * Checks every phase JSON in static/phases/ against the game rules:
 * solvable, not already won, no completed platform at the start, sphere
 * counts intact, and restricted platforms starting with their own element.
 *
 *   bun scripts/verify-phases.ts
 */
import { readdirSync } from 'fs';
import { ELEMENTS, type PhaseData } from '../src/lib/game/types';
import {
	MAX_PER_PLATFORM,
	isComplete,
	isWon,
	levelFromPhase,
	restrictedElements,
	solve
} from './solver';

const files = readdirSync('static/phases')
	.filter((f) => f.endsWith('.json'))
	.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

let failures = 0;

for (const file of files) {
	const phase: PhaseData = await Bun.file(`static/phases/${file}`).json();
	const level = levelFromPhase(phase);
	const restricted = restrictedElements(level.types);
	const problems: string[] = [];

	if (phase.maxPerPlatform !== MAX_PER_PLATFORM) {
		problems.push(`maxPerPlatform is ${phase.maxPerPlatform}, solver assumes ${MAX_PER_PLATFORM}`);
	}
	for (const element of ELEMENTS) {
		const count = level.stacks.flat().filter((s) => s === element).length;
		if (count !== 4) problems.push(`${element} appears ${count} times, expected 4`);
	}
	for (let i = 0; i < level.stacks.length; i++) {
		if (level.stacks[i].length > phase.maxPerPlatform) {
			problems.push(`platform ${i} starts over capacity`);
		}
		const type = level.types[i];
		if (type !== 'neutral' && level.stacks[i][0] !== type) {
			problems.push(`${type} platform starts with ${level.stacks[i][0] ?? 'nothing'}`);
		}
	}
	if (isWon(level.stacks, level.types, restricted)) problems.push('already won at start');
	if (level.stacks.some((s, i) => isComplete(s, level.types[i], restricted))) {
		problems.push('a platform starts complete');
	}

	const moves = problems.length === 0 ? solve(level) : -1;
	if (problems.length === 0 && moves === -1) problems.push('NOT SOLVABLE');

	if (problems.length > 0) {
		failures++;
		console.log(`✗ ${file}: ${problems.join('; ')}`);
	} else {
		console.log(`✓ ${file} (${phase.name}) solvable in <= ${moves} moves`);
	}
}

if (failures > 0) {
	console.log(`\n${failures} of ${files.length} phases failed`);
	process.exit(1);
}
console.log(`\nAll ${files.length} phases OK`);
