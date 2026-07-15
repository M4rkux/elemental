import type { Element } from "./types";

/** Grab sounds per element: an intro played once, then a seamless loop. */
const GRAB_SOUNDS: Partial<Record<Element, { intro: string; loop: string }>> = {
  // fire: { intro: '/sfx/fire_intro.wav', loop: '/sfx/fire_loop.wav' }
  fire: { intro: "/sfx/fogo-bruno.mpeg", loop: "/sfx/fogo-bruno.mpeg" },
  earth: { intro: "/sfx/pedra-bruno.mpeg", loop: "/sfx/pedra-bruno.mpeg" },
};

interface GrabBuffers {
  intro: AudioBuffer;
  loop: AudioBuffer;
}

const SFX_VOLUME = 0.2;

/**
 * Plays the grab sound for an element: the intro once, then the loop until
 * `release()`. Only one grab sound plays at a time — grabbing a group of
 * elements is still a single grab. Uses the Web Audio clock so the loop
 * starts exactly when the intro ends, without a gap.
 */
class GrabSoundPlayer {
  private ctx: AudioContext | null = null;
  private gain: GainNode | null = null;
  private buffers = new Map<Element, Promise<GrabBuffers | null>>();
  private playing: AudioBufferSourceNode[] = [];
  /** Invalidates a grab still waiting on its buffers when released early. */
  private generation = 0;

  /**
   * Fetches and decodes every grab sound so the first grab plays instantly.
   * Safe to call before any user gesture: the AudioContext starts suspended
   * and is resumed on the first grab. Call once when the game screen mounts.
   */
  /** Lazily creates the context and the master volume node. */
  private ensureCtx(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.gain = this.ctx.createGain();
      this.gain.gain.value = SFX_VOLUME;
      this.gain.connect(this.ctx.destination);
    }
    return this.ctx;
  }

  preload(): void {
    this.ensureCtx();
    for (const element of Object.keys(GRAB_SOUNDS) as Element[]) {
      void this.load(element);
    }
  }

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
      .catch(() => {
        // Drop the failed attempt so a later grab can retry the fetch.
        this.buffers.delete(element);
        return null;
      });
    this.buffers.set(element, loading);
    return loading;
  }

  async grab(element: Element): Promise<void> {
    if (!GRAB_SOUNDS[element]) {
      this.release();
      return;
    }
    const ctx = this.ensureCtx();
    if (ctx.state === "suspended") void ctx.resume();
    this.release();
    const generation = this.generation;
    const buffers = await this.load(element);
    // Released (or re-grabbed) while the audio was still loading.
    if (generation !== this.generation || !buffers || !this.gain) return;

    const intro = ctx.createBufferSource();
    intro.buffer = buffers.intro;
    intro.connect(this.gain);

    const loop = ctx.createBufferSource();
    loop.buffer = buffers.loop;
    loop.loop = true;
    loop.connect(this.gain);

    const now = ctx.currentTime;
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
