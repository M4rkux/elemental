export const ELEMENTS = ['earth', 'fire', 'water', 'air'] as const;

export type Element = (typeof ELEMENTS)[number];

/** What a rope slot shows: a real element, or 'mystery' while still hidden. */
export type ElementFace = Element | 'mystery';

/** A platform is either open to any element or restricted to a single one. */
export type PlatformType = 'neutral' | Element;

/** Runtime state of one element hanging on a rope. */
export interface ElementSlot {
	element: Element;
	/** Hidden elements show as a mystery until the element below them is removed. */
	revealed: boolean;
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
	 * on it at once. Mutually exclusive with `hidden`.
	 */
	stoneSecret?: Element;
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
