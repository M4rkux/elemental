import type { Element, PhaseData, PlatformType } from './types';

/**
 * Core rules:
 * - Picking up a sphere takes it and every sphere below it; only allowed when
 *   the whole group is the same element.
 * - On a restricted platform, the run of its own element starting from the top
 *   is locked in place, like a complete platform.
 * - A group can be dropped on a platform when it fits under the capacity and
 *   the current bottom sphere is the same element. On an empty rope any
 *   element goes, except on a restricted platform, whose first sphere must be
 *   its own element. Once occupied, a restricted platform stacks by the normal
 *   bottom-match rule (foreign elements may pass through via the start layout).
 * - A platform is complete when it holds `maxPerPlatform` spheres of one
 *   element; a restricted platform is only complete with its own element, and
 *   an element that has a restricted platform can only be completed there —
 *   never on a neutral platform. Complete platforms are locked.
 * - The phase is won when every platform is empty or complete.
 */
export class GameEngine {
	readonly phaseId: string;
	readonly phaseName: string;
	readonly maxPerPlatform: number;
	readonly platformTypes: readonly PlatformType[];
	/** Elements that have their own restricted platform. */
	readonly restrictedElements: ReadonlySet<Element>;

	platforms = $state<Element[][]>([]);
	moves = $state(0);
	private history = $state<{ from: number; to: number; count: number }[]>([]);

	won = $derived(
		this.platforms.length > 0 &&
			this.platforms.every((p, i) => p.length === 0 || this.isComplete(i))
	);

	constructor(phase: PhaseData) {
		this.phaseId = phase.id;
		this.phaseName = phase.name;
		this.maxPerPlatform = phase.maxPerPlatform;
		this.platformTypes = phase.platforms.map((p) => p.type);
		this.restrictedElements = new Set(
			this.platformTypes.filter((t): t is Element => t !== 'neutral')
		);
		this.platforms = phase.platforms.map((p) => [...p.spheres]);
	}

	isComplete(platform: number): boolean {
		const spheres = this.platforms[platform];
		const type = this.platformTypes[platform];
		if (spheres.length !== this.maxPerPlatform) return false;
		const element = spheres[0];
		if (!spheres.every((s) => s === element)) return false;
		// A restricted element only completes on its own platform.
		return type === 'neutral' ? !this.restrictedElements.has(element) : type === element;
	}

	/**
	 * On a restricted platform, spheres of its own element form a locked run
	 * from the top; those can never be picked up again.
	 */
	lockedCount(platform: number): number {
		const type = this.platformTypes[platform];
		if (type === 'neutral') return 0;
		const spheres = this.platforms[platform];
		let count = 0;
		while (count < spheres.length && spheres[count] === type) count++;
		return count;
	}

	/** True when the sphere at `index` plus everything below it forms a single-element group. */
	canPick(platform: number, index: number): boolean {
		const spheres = this.platforms[platform];
		if (index < 0 || index >= spheres.length) return false;
		if (this.isComplete(platform)) return false;
		if (index < this.lockedCount(platform)) return false;
		const element = spheres[index];
		return spheres.slice(index).every((s) => s === element);
	}

	/** The group of spheres that would be dragged when grabbing `index`. */
	groupAt(platform: number, index: number): Element[] {
		return this.canPick(platform, index) ? this.platforms[platform].slice(index) : [];
	}

	canDrop(platform: number, element: Element, count: number): boolean {
		const spheres = this.platforms[platform];
		if (spheres.length + count > this.maxPerPlatform) return false;
		if (this.isComplete(platform)) return false;
		if (spheres.length === 0) {
			const type = this.platformTypes[platform];
			return type === 'neutral' || type === element;
		}
		return spheres[spheres.length - 1] === element;
	}

	/** Attempts to move the group starting at `index` from one platform to another. */
	move(from: number, index: number, to: number): boolean {
		if (from === to) return false;
		if (!this.canPick(from, index)) return false;
		const group = this.platforms[from].slice(index);
		if (!this.canDrop(to, group[0], group.length)) return false;

		this.platforms[from] = this.platforms[from].slice(0, index);
		this.platforms[to] = [...this.platforms[to], ...group];
		this.moves += 1;
		this.history = [...this.history, { from, to, count: group.length }];
		return true;
	}

	get canUndo(): boolean {
		return this.history.length > 0;
	}

	/** Reverts the last move. The move counter stays as is — undo isn't free. */
	undo(): boolean {
		const last = this.history[this.history.length - 1];
		if (!last) return false;
		this.history = this.history.slice(0, -1);
		const group = this.platforms[last.to].slice(-last.count);
		this.platforms[last.to] = this.platforms[last.to].slice(0, -last.count);
		this.platforms[last.from] = [...this.platforms[last.from], ...group];
		return true;
	}
}
