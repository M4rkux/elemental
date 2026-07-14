import { browser } from "$app/environment";

// v2: completed level numbers; v1 stored phase id strings.
const STORAGE_KEY = "elemental.progress.v2";

/**
 * Campaign progress persisted in localStorage. Levels unlock in order: a level
 * is playable only when the previous number has been completed.
 */
class Progress {
  completed = $state<number[]>([]);

  constructor() {
    if (!browser) return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.completed = parsed.filter(
            (n): n is number => typeof n === "number",
          );
        }
      }
    } catch {
      // Corrupted storage; start fresh.
    }
  }

  isCompleted(number: number): boolean {
    return this.completed.includes(number);
  }

  isUnlocked(number: number): boolean {
    return number === 1 || this.isCompleted(number - 1);
  }

  complete(number: number): void {
    if (this.isCompleted(number)) return;
    this.completed = [...this.completed, number];
    if (!browser) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.completed));
    } catch {
      // Storage full or unavailable; progress just won't persist.
    }
  }

  /** First unfinished level number; falls back to the last when everything is done. */
  firstUnfinished(numbers: number[]): number {
    return (
      numbers.find((n) => !this.isCompleted(n)) ?? numbers[numbers.length - 1]
    );
  }
}

export const progress = new Progress();
