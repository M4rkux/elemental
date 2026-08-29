export const ELEMENTS = ['earth', 'fire', 'water', 'air'] as const;

export type Element = (typeof ELEMENTS)[number];

/** What a rope slot shows: a real element, or 'mystery' while still hidden. */
export type ElementFace = Element | 'mystery';

/** A platform is either open to any element or restricted to a single one. */
export type PlatformType = 'neutral' | Element;

/** Colour id linking a key to the vault it opens. */
export const KEY_COLORS = ['a', 'b'] as const;
export type KeyColor = (typeof KEY_COLORS)[number];

/** Runtime state of one element hanging on a rope. */
export interface ElementSlot {
	element: Element;
	/** Hidden elements show as a mystery until the element below them is removed. */
	revealed: boolean;
	/**
	 * A key bound to this element, of the given colour. Keys never move: the
	 * element carrying one (and everything above it on the rope) can't be picked
	 * up until the key's vault opens, which happens the moment the keyed element
	 * is the exposed bottom of any rope. Cleared once that vault opens.
	 */
	key?: KeyColor;
}

export interface PlatformData {
	type: PlatformType;
	/** Elements hanging on the rope. Index 0 is at the top (closest to the base), the last item hangs lowest. */
	elements: Element[];
	/**
	 * Indexes into `elements` that start hidden as mystery elements. A hidden
	 * element must have another element below it (index < elements.length - 1),
	 * since the bottom of a rope is always revealed.
	 */
	hidden?: number[];
	/**
	 * Seals the whole rope under a stone showing this element's icon: every
	 * element on it starts hidden — including the bottom, unlike `hidden` — and
	 * the platform can't be picked from or dropped onto. It breaks the moment
	 * any *other* platform completes with this element, revealing everything
	 * on it at once — except indexes also listed in `hidden`, which stay
	 * covered as an ordinary mystery from then on (same coverage rule: not the
	 * last index).
	 */
	stoneSecret?: Element;
	/**
	 * Keys hanging on this rope. Each names an index into `elements` and a
	 * colour. A keyed element can't start at the bottom of its rope, or
	 * directly on top of another element of its own kind.
	 */
	keys?: { index: number; color: KeyColor }[];
	/**
	 * Seals the whole rope under a vault box of this colour: like `stoneSecret`
	 * every element starts hidden and the platform can't be picked from or
	 * dropped onto. It opens the moment the matching-colour key is freed to the
	 * exposed bottom of any rope, revealing everything at once (residual
	 * `hidden` indexes stay covered, same rule as a stone).
	 */
	lock?: KeyColor;
}

/** The playable board of a level; stored as the `data` jsonb column. */
export interface LevelGameData {
	/** Maximum number of elements a platform's rope can hold. */
	maxPerPlatform: number;
	platforms: PlatformData[];
}

export interface LevelData {
	/** Unique campaign position, 1..∞. */
	number: number;
	/** Levels are grouped in stages; stage 1 holds levels 1–10, and so on. */
	stage: number;
	name: string;
	data: LevelGameData;
}
