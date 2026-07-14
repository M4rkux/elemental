import type { Element } from './types';

/** Grab sounds per element: an intro played once, then a seamless loop. */
const GRAB_SOUNDS: Partial<Record<Element, { intro: string; loop: string }>> = {
	fire: { intro: '/sfx/fire_intro.wav', loop: '/sfx/fire_loop.wav' }
};

interface GrabBuffers {
	intro: AudioBuffer;
	loop: AudioBuffer;
}

/**
 * Plays the grab sound for an element: the intro once, then the loop until
 * `release()`. Only one grab sound plays at a time — grabbing a group of
 * elements is still a single grab. Uses the Web Audio clock so the loop
 * starts exactly when the intro ends, without a gap.
 */
class GrabSoundPlayer {
	private ctx: AudioContext | null = null;
	private buffers = new Map<Element, Promise<GrabBuffers | null>>();
	private playing: AudioBufferSourceNode[] = [];
	/** Invalidates a grab still waiting on its buffers when released early. */
	private generation = 0;

	private async load(element: Element): Promise<GrabBuffers | null> {
		const urls = GRAB_SOUNDS[element];
		if (!urls || !this.ctx) return null;
		const cached = this.buffers.get(element);
		if (cached) return cached;
		const ctx = this.ctx;
		const decode = async (url: string) => {
			const response = await fetch(url);
			return ctx.decodeAudioData(await response.arrayBuffer());
		};
		const loading = Promise.all([decode(urls.intro), decode(urls.loop)])
			.then(([intro, loop]) => ({ intro, loop }))
			.catch(() => null);
		this.buffers.set(element, loading);
		return loading;
	}

	async grab(element: Element): Promise<void> {
		if (!GRAB_SOUNDS[element]) {
			this.release();
			return;
		}
		this.ctx ??= new AudioContext();
		if (this.ctx.state === 'suspended') void this.ctx.resume();
		this.release();
		const generation = this.generation;
		const buffers = await this.load(element);
		// Released (or re-grabbed) while the audio was still loading.
		if (generation !== this.generation || !buffers) return;

		const intro = this.ctx.createBufferSource();
		intro.buffer = buffers.intro;
		intro.connect(this.ctx.destination);

		const loop = this.ctx.createBufferSource();
		loop.buffer = buffers.loop;
		loop.loop = true;
		loop.connect(this.ctx.destination);

		const now = this.ctx.currentTime;
		intro.start(now);
		loop.start(now + buffers.intro.duration);
		this.playing = [intro, loop];
	}

	release(): void {
		this.generation += 1;
		for (const source of this.playing) {
			try {
				source.stop();
			} catch {
				// Sources scheduled but never started throw; nothing to stop.
			}
			source.disconnect();
		}
		this.playing = [];
	}
}

export const grabSound = new GrabSoundPlayer();
