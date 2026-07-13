import { browser } from '$app/environment';
import { PHASES } from './phases';

const STORAGE_KEY = 'elemental.progress.v1';

/**
 * Campaign progress persisted in localStorage. Phases unlock in order: a phase
 * is playable only when the previous one has been completed.
 */
class Progress {
	completed = $state<string[]>([]);

	constructor() {
		if (!browser) return;
		try {
			const raw = localStorage.getItem(STORAGE_KEY);
			if (raw) {
				const parsed: unknown = JSON.parse(raw);
				if (Array.isArray(parsed)) {
					this.completed = parsed.filter((id): id is string => typeof id === 'string');
				}
			}
		} catch {
			// Corrupted storage; start fresh.
		}
	}

	isCompleted(id: string): boolean {
		return this.completed.includes(id);
	}

	isUnlocked(id: string): boolean {
		const index = PHASES.findIndex((p) => p.id === id);
		if (index === -1) return false;
		return index === 0 || this.isCompleted(PHASES[index - 1].id);
	}

	complete(id: string): void {
		if (this.isCompleted(id)) return;
		this.completed = [...this.completed, id];
		if (!browser) return;
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(this.completed));
		} catch {
			// Storage full or unavailable; progress just won't persist.
		}
	}

	/** First unfinished phase; falls back to the first phase when everything is done. */
	get current(): (typeof PHASES)[number] {
		return PHASES.find((p) => !this.isCompleted(p.id)) ?? PHASES[0];
	}
}

export const progress = new Progress();
