import type { Element, ElementSlot, LevelData, PlatformType } from './types';

/**
 * Core rules:
 * - Picking up an element takes it and every element below it; only allowed
 *   when the whole group is the same element and fully revealed.
 * - Mystery elements are hidden: they can't be picked (not even grouped with a
 *   matching element below) and are revealed when the element below them is
 *   removed, i.e. when they become the bottom of their rope. Reveals are
 *   permanent — undo doesn't re-hide what the player has already seen.
 * - On a restricted platform, the run of its own revealed element starting
 *   from the top is locked in place, like a complete platform.
 * - A group can be dropped on a platform when it fits under the capacity and
 *   the current bottom element is the same. On an empty rope any element
 *   goes, except on a restricted platform, whose first element must be its
 *   own. Once occupied, a restricted platform stacks by the normal
 *   bottom-match rule (foreign elements may pass through via the start layout).
 * - A platform is complete when it holds `maxPerPlatform` revealed elements of
 *   one kind; a restricted platform is only complete with its own element, and
 *   an element that has a restricted platform can only be completed there —
 *   never on a neutral platform. Complete platforms are locked.
 * - The level is won when every platform is empty or complete.
 */
export class GameEngine {
	readonly levelNumber: number;
	readonly levelName: string;
	readonly maxPerPlatform: number;
	readonly platformTypes: readonly PlatformType[];
	/** Elements that have their own restricted platform. */
	readonly restrictedElements: ReadonlySet<Element>;

	platforms = $state<ElementSlot[][]>([]);
	moves = $state(0);
	/** Set when the last move revealed a mystery element; the UI clears it after animating. */
	lastReveal = $state<{ platform: number; index: number } | null>(null);
	private history = $state<{ from: number; to: number; count: number }[]>([]);

	won = $derived(
		this.platforms.length > 0 &&
			this.platforms.every((p, i) => p.length === 0 || this.isComplete(i))
	);

	constructor(level: LevelData) {
		this.levelNumber = level.number;
		this.levelName = level.name;
		this.maxPerPlatform = level.data.maxPerPlatform;
		this.platformTypes = level.data.platforms.map((p) => p.type);
		this.restrictedElements = new Set(
			this.platformTypes.filter((t): t is Element => t !== 'neutral')
		);
		this.platforms = level.data.platforms.map((p) =>
			p.elements.map((element, i) => ({
				element,
				// The bottom of a rope is always revealed, whatever the data says.
				revealed: !p.hidden?.includes(i) || i === p.elements.length - 1
			}))
		);
	}

	isComplete(platform: number): boolean {
		const slots = this.platforms[platform];
		const type = this.platformTypes[platform];
		if (slots.length !== this.maxPerPlatform) return false;
		const element = slots[0].element;
		if (!slots.every((s) => s.revealed && s.element === element)) return false;
		// A restricted element only completes on its own platform.
		return type === 'neutral' ? !this.restrictedElements.has(element) : type === element;
	}

	/**
	 * On a restricted platform, revealed elements of its own kind form a locked
	 * run from the top; those can never be picked up again.
	 */
	lockedCount(platform: number): number {
		const type = this.platformTypes[platform];
		if (type === 'neutral') return 0;
		const slots = this.platforms[platform];
		let count = 0;
		while (count < slots.length && slots[count].revealed && slots[count].element === type) {
			count++;
		}
		return count;
	}

	/** True when the element at `index` plus everything below it forms a revealed single-element group. */
	canPick(platform: number, index: number): boolean {
		const slots = this.platforms[platform];
		if (index < 0 || index >= slots.length) return false;
		if (this.isComplete(platform)) return false;
		if (index < this.lockedCount(platform)) return false;
		const element = slots[index].element;
		return slots.slice(index).every((s) => s.revealed && s.element === element);
	}

	/** The group of elements that would be dragged when grabbing `index`. */
	groupAt(platform: number, index: number): Element[] {
		return this.canPick(platform, index)
			? this.platforms[platform].slice(index).map((s) => s.element)
			: [];
	}

	canDrop(platform: number, element: Element, count: number): boolean {
		const slots = this.platforms[platform];
		if (slots.length + count > this.maxPerPlatform) return false;
		if (this.isComplete(platform)) return false;
		if (slots.length === 0) {
			const type = this.platformTypes[platform];
			return type === 'neutral' || type === element;
		}
		return slots[slots.length - 1].element === element;
	}

	/** Attempts to move the group starting at `index` from one platform to another. */
	move(from: number, index: number, to: number): boolean {
		if (from === to) return false;
		if (!this.canPick(from, index)) return false;
		const group = this.platforms[from].slice(index);
		if (!this.canDrop(to, group[0].element, group.length)) return false;

		// A mystery at the bottom of the source rope gets revealed.
		const remaining = this.platforms[from].slice(0, index);
		const last = remaining[remaining.length - 1];
		if (last && !last.revealed) {
			remaining[remaining.length - 1] = { element: last.element, revealed: true };
			this.lastReveal = { platform: from, index: remaining.length - 1 };
		}
		this.platforms[from] = remaining;
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
