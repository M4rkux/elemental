export const ELEMENTS = ['earth', 'fire', 'water', 'air'] as const;

export type Element = (typeof ELEMENTS)[number];

/** A platform is either open to any element or restricted to a single one. */
export type PlatformType = 'neutral' | Element;

export interface PlatformData {
	type: PlatformType;
	/** Spheres hanging on the rope. Index 0 is at the top (closest to the base), the last item hangs lowest. */
	spheres: Element[];
}

export interface PhaseData {
	id: string;
	name: string;
	/** Maximum number of spheres a platform's rope can hold. */
	maxPerPlatform: number;
	platforms: PlatformData[];
}
