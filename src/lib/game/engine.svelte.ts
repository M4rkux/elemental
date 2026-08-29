import type { Element, ElementSlot, KeyColor, LevelData, PlatformType } from './types';

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
 * - A stone-secret platform starts entirely hidden — even its bottom, unlike
 *   an ordinary mystery — and can't be picked from or dropped onto. It breaks
 *   the instant any *other* platform completes with the element on its stone,
 *   revealing everything on it at once, except any of its own elements that
 *   are *also* an ordinary mystery: those stay hidden and follow the normal
 *   mystery rule from then on. Like other reveals, breaking is permanent:
 *   undo doesn't re-seal it.
 * - A vault-locked platform is covered the same way (all hidden, no pick/drop).
 *   It opens when the key of its colour becomes the exposed bottom of any rope.
 *   Keys never move: an element carrying one, and everything above it on that
 *   rope, can't be picked up until the key's vault opens. Dropping a group onto
 *   a rope whose bottom carries a still-active key is refused. Opening is
 *   permanent and clears the key.
 */
export class GameEngine {
	readonly levelNumber: number;
	readonly levelName: string;
	readonly maxPerPlatform: number;
	readonly platformTypes: readonly PlatformType[];
	/** Elements that have their own restricted platform. */
	readonly restrictedElements: ReadonlySet<Element>;
	/** Per platform, the element that must be completed elsewhere to break its stone seal. */
	readonly stoneSecret: readonly (Element | null)[];
	/** Per platform, the colour of the vault sealing it, if any. */
	readonly lock: readonly (KeyColor | null)[];
	/** Per platform, the indexes that stay hidden as an ordinary mystery even after a stone seal or vault opens. */
	private readonly ownHidden: readonly ReadonlySet<number>[];

	platforms = $state<ElementSlot[][]>([]);
	moves = $state(0);
	/** Set when the last move revealed a mystery element; the UI clears it after animating. */
	lastReveal = $state<{ platform: number; index: number } | null>(null);
	/** Set when the last move broke a stone seal; the UI clears it after animating. */
	lastStoneBreak = $state<number | null>(null);
	/** Set when the last move opened a vault; the UI clears it after animating. */
	lastVaultOpen = $state<{
		platform: number;
		color: KeyColor;
		keyFrom: { platform: number; index: number } | null;
	} | null>(null);
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
		this.stoneSecret = level.data.platforms.map((p) => p.stoneSecret ?? null);
		this.lock = level.data.platforms.map((p) => p.lock ?? null);
		this.ownHidden = level.data.platforms.map((p) => new Set(p.hidden ?? []));
		this.platforms = level.data.platforms.map((p) => {
			const slots: ElementSlot[] = p.elements.map((element, i) => ({
				element,
				// Stone-sealed and vault-locked ropes start fully hidden, bottom
				// included; otherwise the bottom of a rope is always revealed.
				revealed:
					p.stoneSecret || p.lock ? false : !p.hidden?.includes(i) || i === p.elements.length - 1
			}));
			for (const k of p.keys ?? []) if (slots[k.index]) slots[k.index].key = k.color;
			return slots;
		});
	}

	/** True while a vault of `color` is still sealed (its rope's bottom hidden). */
	private vaultSealed(color: KeyColor): boolean {
		return this.platforms.some((slots, i) => {
			if (this.lock[i] !== color) return false;
			const bottom = slots[slots.length - 1];
			return bottom !== undefined && !bottom.revealed;
		});
	}

	/**
	 * True while a stone-secret platform's seal hasn't broken yet. The bottom
	 * slot is the tell: sealed forces it hidden too, and breaking always
	 * reveals it (even when an ordinary mystery elsewhere on the same
	 * platform stays hidden), so it can't be confused with that residual case.
	 */
	isSealed(platform: number): boolean {
		if (this.stoneSecret[platform] === null) return false;
		const slots = this.platforms[platform];
		const bottom = slots[slots.length - 1];
		return bottom !== undefined && !bottom.revealed;
	}

	/** True while a vault still covers this platform. Same bottom-hidden tell as a stone. */
	isLocked(platform: number): boolean {
		if (this.lock[platform] === null) return false;
		const slots = this.platforms[platform];
		const bottom = slots[slots.length - 1];
		return bottom !== undefined && !bottom.revealed;
	}

	/** Covered by a stone or a vault — can't be picked from or dropped onto. */
	isCovered(platform: number): boolean {
		return this.isSealed(platform) || this.isLocked(platform);
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
		if (this.isCovered(platform)) return false;
		if (this.isComplete(platform)) return false;
		if (index < this.lockedCount(platform)) return false;
		const element = slots[index].element;
		// A group carrying a key whose vault is still sealed is pinned in place.
		return slots
			.slice(index)
			.every(
				(s) =>
					s.revealed && s.element === element && !(s.key !== undefined && this.vaultSealed(s.key))
			);
	}

	/** The group of elements that would be dragged when grabbing `index`. */
	groupAt(platform: number, index: number): Element[] {
		return this.canPick(platform, index)
			? this.platforms[platform].slice(index).map((s) => s.element)
			: [];
	}

	canDrop(platform: number, element: Element, count: number): boolean {
		const slots = this.platforms[platform];
		// Covered even when empty or bottom-matching: a stone/vault rope can't be
		// used as a shortcut to dodge the trigger requirement.
		if (this.isCovered(platform)) return false;
		if (slots.length + count > this.maxPerPlatform) return false;
		if (this.isComplete(platform)) return false;
		if (slots.length === 0) {
			const type = this.platformTypes[platform];
			return type === 'neutral' || type === element;
		}
		const bottom = slots[slots.length - 1];
		// Can't bury a key that still needs to reach a bottom.
		if (bottom.key !== undefined && this.vaultSealed(bottom.key)) return false;
		return bottom.element === element;
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
			remaining[remaining.length - 1] = { ...last, revealed: true };
			this.lastReveal = { platform: from, index: remaining.length - 1 };
		}
		this.platforms[from] = remaining;
		this.platforms[to] = [...this.platforms[to], ...group];
		this.moves += 1;
		this.history = [...this.history, { from, to, count: group.length }];
		this.resolveSeals();
		return true;
	}

	/** Runs stone breaks and vault opens to a fixed point (each can trigger the other). */
	private resolveSeals(): void {
		for (let guard = 0; guard < 8; guard++) {
			const broke = this.breakStones();
			const opened = this.openVaults();
			if (!broke && !opened) break;
		}
	}

	/**
	 * Opens any vault whose matching-colour key is the exposed bottom of a rope,
	 * revealing its contents and clearing the freed key so its element moves
	 * again. Permanent, like a stone break.
	 */
	private openVaults(): boolean {
		let changed = false;
		for (let i = 0; i < this.platforms.length; i++) {
			const color = this.lock[i];
			if (color === null || !this.isLocked(i)) continue;
			let keyFrom: { platform: number; index: number } | null = null;
			const freed = this.platforms.some((slots, p) => {
				const bi = slots.length - 1;
				if (bi >= 0 && slots[bi].revealed && slots[bi].key === color) {
					keyFrom = { platform: p, index: bi };
					return true;
				}
				return false;
			});
			if (!freed) continue;
			const hidden = this.ownHidden[i];
			const last = this.platforms[i].length - 1;
			this.platforms[i] = this.platforms[i].map((s, idx) => ({
				...s,
				revealed: !hidden.has(idx) || idx === last
			}));
			this.platforms = this.platforms.map((slots) =>
				slots.map((s) => (s.key === color ? { ...s, key: undefined } : s))
			);
			this.lastVaultOpen = { platform: i, color, keyFrom };
			changed = true;
		}
		return changed;
	}

	/** Breaks any stone seal whose required element just got completed on another platform. */
	private breakStones(): boolean {
		let changed = false;
		for (let i = 0; i < this.platforms.length; i++) {
			const need = this.stoneSecret[i];
			if (!need || !this.isSealed(i)) continue;
			const satisfied = this.platforms.some(
				(_, j) => j !== i && this.isComplete(j) && this.platforms[j][0].element === need
			);
			if (!satisfied) continue;
			const hidden = this.ownHidden[i];
			const last = this.platforms[i].length - 1;
			this.platforms[i] = this.platforms[i].map((s, idx) => ({
				...s,
				revealed: !hidden.has(idx) || idx === last
			}));
			this.lastStoneBreak = i;
			changed = true;
		}
		return changed;
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
