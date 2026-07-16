import type { Element } from "./types";

/** Grab sounds per element: an intro played once, then a seamless loop. */
const GRAB_SOUNDS: Partial<Record<Element, { intro: string; loop: string }>> = {
  // fire: { intro: '/sfx/fire_intro.wav', loop: '/sfx/fire_loop.wav' }
  fire: { intro: "/sfx/fogo-bruno.mpeg", loop: "/sfx/fogo-bruno.mpeg" },
  earth: { intro: "/sfx/pedra-bruno.mpeg", loop: "/sfx/pedra-bruno.mpeg" },
  air: { intro: "/sfx/vento-bruno.mpeg", loop: "/sfx/vento-bruno.mpeg" },
  water: { intro: "/sfx/agua-bruno.mpeg", loop: "/sfx/agua-bruno.mpeg" },
};

interface GrabBuffers {
  intro: AudioBuffer;
  loop: AudioBuffer;
}

/** Master SFX volume. Will become a user setting; every sound scales under it. */
const SFX_VOLUME = 1;

// Internal per-sound mix levels, applied on top of the master volume.
const GRAB_VOLUME = 0.2;
const TAP_VOLUME = 1;
const REVEAL_VOLUME = 0.5;
const COMPLETE_VOLUME = 0.5;

// All players share one AudioContext (browsers cap how many a page can
// have); each carves out its own gain node for its mix level.
let sharedCtx: AudioContext | null = null;

function ensureCtx(): AudioContext {
  if (!sharedCtx) sharedCtx = new AudioContext();
  return sharedCtx;
}

function makeGain(volume: number): GainNode {
  const ctx = ensureCtx();
  const gain = ctx.createGain();
  gain.gain.value = SFX_VOLUME * volume;
  gain.connect(ctx.destination);
  return gain;
}

/**
 * Plays the grab sound for an element: the intro once, then the loop until
 * `release()`. Only one grab sound plays at a time — grabbing a group of
 * elements is still a single grab. Uses the Web Audio clock so the loop
 * starts exactly when the intro ends, without a gap.
 */
class GrabSoundPlayer {
  private gain: GainNode | null = null;
  private buffers = new Map<Element, Promise<GrabBuffers | null>>();
  private playing: AudioBufferSourceNode[] = [];
  /** Invalidates a grab still waiting on its buffers when released early. */
  private generation = 0;

  /** Lazily creates the shared context and this player's volume node. */
  private ensureCtx(): AudioContext {
    const ctx = ensureCtx();
    if (!this.gain) this.gain = makeGain(GRAB_VOLUME);
    return ctx;
  }

  /**
   * Fetches and decodes every grab sound so the first grab plays instantly.
   * Safe to call before any user gesture: the AudioContext starts suspended
   * and is resumed on the first grab. Call once when the game screen mounts.
   */
  preload(): void {
    this.ensureCtx();
    for (const element of Object.keys(GRAB_SOUNDS) as Element[]) {
      void this.load(element);
    }
  }

  private async load(element: Element): Promise<GrabBuffers | null> {
    const urls = GRAB_SOUNDS[element];
    if (!urls) return null;
    const cached = this.buffers.get(element);
    if (cached) return cached;
    const ctx = this.ensureCtx();
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

/**
 * A one-shot sound effect. Overlapping plays are fine: each play spawns its
 * own source node.
 */
class OneShotPlayer {
  private gain: GainNode | null = null;
  private buffer: Promise<AudioBuffer | null> | null = null;

  constructor(
    private readonly url: string,
    private readonly volume: number,
  ) {}

  private ensureCtx(): AudioContext {
    const ctx = ensureCtx();
    if (!this.gain) this.gain = makeGain(this.volume);
    return ctx;
  }

  preload(): void {
    this.ensureCtx();
    void this.load();
  }

  private load(): Promise<AudioBuffer | null> {
    if (this.buffer) return this.buffer;
    const ctx = this.ensureCtx();
    this.buffer = fetch(this.url)
      .then(async (response) =>
        ctx.decodeAudioData(await response.arrayBuffer()),
      )
      .catch(() => {
        // Drop the failed attempt so a later play can retry the fetch.
        this.buffer = null;
        return null;
      });
    return this.buffer;
  }

  async play(): Promise<void> {
    const ctx = this.ensureCtx();
    if (ctx.state === "suspended") void ctx.resume();
    const buffer = await this.load();
    if (!buffer || !this.gain) return;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(this.gain);
    source.start();
  }
}

/** Played when a group of elements lands on a platform. */
export const tapSound = new OneShotPlayer("/sfx/tap_sound.wav", TAP_VOLUME);

/** Played when a mystery element is revealed. */
export const revealSound = new OneShotPlayer("/sfx/reveal.wav", REVEAL_VOLUME);

const COMPLETE_PLAYERS: Record<Element, OneShotPlayer> = {
  earth: new OneShotPlayer("/sfx/earth_complete.m4a", COMPLETE_VOLUME),
  fire: new OneShotPlayer("/sfx/fire_complete.wav", COMPLETE_VOLUME),
  water: new OneShotPlayer("/sfx/water_complete.m4a", COMPLETE_VOLUME),
  air: new OneShotPlayer("/sfx/air_complete.wav", COMPLETE_VOLUME),
};

/** Played when a platform is completed with its element. */
export const completeSound = {
  preload(): void {
    for (const player of Object.values(COMPLETE_PLAYERS)) player.preload();
  },
  play(element: Element): Promise<void> {
    return COMPLETE_PLAYERS[element].play();
  },
};
