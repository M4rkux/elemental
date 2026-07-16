<script lang="ts">
  import { GameEngine } from "$lib/game/engine.svelte";
  import {
    completeSound,
    grabSound,
    revealSound,
    tapSound,
  } from "$lib/game/sfx";
  import type { Element, LevelData } from "$lib/game/types";
  import ElementParticles from "./ElementParticles.svelte";
  import ElementPiece from "./ElementPiece.svelte";
  import Platform from "./Platform.svelte";

  let {
    level,
    nextHref,
    onwin,
    onrestart,
  }: {
    level: LevelData;
    nextHref?: string;
    onwin?: () => void;
    onrestart: () => void;
  } = $props();

  // The board is remounted (keyed) for restarts, so reading `level` once is intentional.
  // svelte-ignore state_referenced_locally
  const engine = new GameEngine(level);

  interface Drag {
    from: number;
    index: number;
    group: Element[];
    x: number;
    y: number;
    offsetX: number;
    offsetY: number;
  }

  // Matches the platform completion animation in Platform.svelte:
  // 250ms base fill + 450ms rope fill, plus a small buffer.
  const WIN_ANIMATION_MS = 750;

  let showWin = $state(false);

  $effect(() => {
    if (!engine.won) return;
    onwin?.();
    // The win overlay waits for the last platform's fill animation.
    const timer = setTimeout(() => (showWin = true), WIN_ANIMATION_MS);
    return () => clearTimeout(timer);
  });

  // Sounds are game content: fetch and decode them up front so the first
  // grab plays with no delay. The board can also unmount mid-drag (restart
  // remounts it); cut the sound too.
  $effect(() => {
    grabSound.preload();
    tapSound.preload();
    revealSound.preload();
    completeSound.preload();
    return () => grabSound.release();
  });

  // A reveal plays in two stages: the slot keeps its mystery face for a
  // short beat, then the spin-in + burst ring + sound land together. The
  // engine marker is cleared once the whole sequence is done.
  const REVEAL_DELAY_MS = 200;
  const REVEAL_ANIMATION_MS = 950;

  let maskedReveal = $state<{ platform: number; index: number } | null>(null);
  let activeReveal = $state<{ platform: number; index: number } | null>(null);

  $effect(() => {
    const reveal = engine.lastReveal;
    if (!reveal) return;
    maskedReveal = reveal;
    const show = setTimeout(() => {
      maskedReveal = null;
      activeReveal = reveal;
      void revealSound.play();
    }, REVEAL_DELAY_MS);
    const done = setTimeout(() => {
      activeReveal = null;
      engine.lastReveal = null;
    }, REVEAL_DELAY_MS + REVEAL_ANIMATION_MS);
    return () => {
      clearTimeout(show);
      clearTimeout(done);
      maskedReveal = null;
      activeReveal = null;
    };
  });

  let drag = $state<Drag | null>(null);
  let dropTarget = $state<number | null>(null);
  let platformEls: (HTMLElement | undefined)[] = $state([]);

  interface Burst {
    id: number;
    x: number;
    y: number;
    element: Element;
  }

  let bursts = $state<Burst[]>([]);
  let nextBurstId = 0;

  // Layout constants from Platform/ElementPiece styles, used to aim the
  // placement burst at the middle of the just-dropped group.
  const BASE_REM = 1.9 + 0.35; // platform base + rope-area top padding
  const SLOT_REM = 3.55; // piece (3.25) + gap (0.3)

  /** Fires a short particle burst centered on the group just placed. */
  function spawnBurst(platform: number, element: Element, count: number) {
    const el = platformEls[platform];
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const firstPlaced = engine.platforms[platform].length - count;
    const centerSlot = firstPlaced + (count - 1) / 2;
    const id = nextBurstId++;
    bursts = [
      ...bursts,
      {
        id,
        element,
        x: rect.left + rect.width / 2,
        y: rect.top + (BASE_REM + (centerSlot + 0.5) * SLOT_REM) * rem,
      },
    ];
    // Longest particle: 0.05s delay + 0.5s duration; drop well after that.
    setTimeout(() => (bursts = bursts.filter((b) => b.id !== id)), 700);
  }

  function grab(platform: number, index: number, event: PointerEvent) {
    if (engine.won || drag || !engine.canPick(platform, index)) return;
    event.preventDefault();
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    drag = {
      from: platform,
      index,
      group: engine.groupAt(platform, index),
      x: event.clientX,
      y: event.clientY,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
    };
    dropTarget = null;
    void grabSound.grab(drag.group[0]);
  }

  function targetAt(x: number, y: number): number | null {
    for (let i = 0; i < platformEls.length; i++) {
      const el = platformEls[i];
      if (!el || i === drag?.from) continue;
      const rect = el.getBoundingClientRect();
      if (
        x >= rect.left &&
        x <= rect.right &&
        y >= rect.top &&
        y <= rect.bottom
      ) {
        return i;
      }
    }
    return null;
  }

  function onPointerMove(event: PointerEvent) {
    if (!drag) return;
    drag.x = event.clientX;
    drag.y = event.clientY;
    dropTarget = targetAt(event.clientX, event.clientY);
  }

  function onPointerUp() {
    if (!drag) return;
    grabSound.release();
    if (dropTarget !== null && engine.move(drag.from, drag.index, dropTarget)) {
      spawnBurst(dropTarget, drag.group[0], drag.group.length);
      void tapSound.play();
      // Complete platforms reject drops, so completeness here means the
      // move just sealed the platform.
      if (engine.isComplete(dropTarget)) {
        void completeSound.play(drag.group[0]);
      }
    }
    drag = null;
    dropTarget = null;
  }

  function dropStateFor(platform: number): "valid" | "invalid" | null {
    if (!drag || dropTarget !== platform) return null;
    return engine.canDrop(platform, drag.group[0], drag.group.length)
      ? "valid"
      : "invalid";
  }
</script>

<svelte:window
  onpointermove={onPointerMove}
  onpointerup={onPointerUp}
  onpointercancel={onPointerUp}
/>

<div class="board" class:board--dragging={drag !== null}>
  <header class="hud">
    <div class="hud-title">
      <h1>
        Level {engine.levelNumber}
        <span class="level-name">· {engine.levelName}</span>
      </h1>
      <p>Moves&nbsp;&nbsp;{engine.moves}</p>
    </div>
    <div class="hud-actions">
      <a class="hud-button glass" href="/">Menu</a>
      <button
        class="hud-button glass"
        disabled={!engine.canUndo}
        onclick={() => engine.undo()}
      >
        Undo
      </button>
      <button class="hud-button glass" onclick={onrestart}>Restart</button>
    </div>
  </header>

  <div class="platforms">
    {#each engine.platforms as slots, i (i)}
      <Platform
        type={engine.platformTypes[i]}
        {slots}
        maxPerPlatform={engine.maxPerPlatform}
        complete={engine.isComplete(i)}
        lockedCount={engine.lockedCount(i)}
        pickable={(index) => !drag && !engine.won && engine.canPick(i, index)}
        hiddenFrom={drag?.from === i ? drag.index : null}
        maskedIndex={maskedReveal?.platform === i ? maskedReveal.index : null}
        revealingIndex={activeReveal?.platform === i
          ? activeReveal.index
          : null}
        dropState={dropStateFor(i)}
        onGrab={(index, event) => grab(i, index, event)}
        bind:el={platformEls[i]}
      />
    {/each}
  </div>

  {#if drag}
    <div
      class="ghost"
      style:left="{drag.x - drag.offsetX}px"
      style:top="{drag.y - drag.offsetY}px"
    >
      {#each drag.group as element, i (i)}
        <ElementPiece {element} grabbed />
      {/each}
    </div>
  {/if}

  {#each bursts as burst (burst.id)}
    <div class="burst-anchor" style:left="{burst.x}px" style:top="{burst.y}px">
      <ElementParticles element={burst.element} mode="burst" />
    </div>
  {/each}

  {#if showWin}
    <div class="win-overlay">
      <div class="win-panel panel">
        <div class="win-eyebrow">Level {engine.levelNumber} complete</div>
        <h2>Balance Restored</h2>
        <p>Solved in {engine.moves} moves</p>
        <div class="win-actions">
          {#if nextHref}
            <a class="hud-button hud-button--primary gold-pill" href={nextHref}
              >Next level</a
            >
          {/if}
          <button class="hud-button glass" onclick={onrestart}
            >Play again</button
          >
          <a class="hud-button glass" href="/">Menu</a>
        </div>
      </div>
    </div>
  {/if}
</div>

<style lang="scss">
  .board {
    max-width: 64rem;
    margin: 0 auto;
    padding: 1rem;
    user-select: none;
    -webkit-user-select: none;
    touch-action: none;

    &--dragging {
      cursor: grabbing;
    }
  }

  .hud {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 0.75rem;
    margin-bottom: 1.5rem;
  }

  .hud-title {
    h1 {
      font-family: "Marcellus", serif;
      font-size: 1.3rem;
      font-weight: 400;
      letter-spacing: 0.04em;
      color: var(--gold-2);
    }

    .level-name {
      color: var(--ink-dimmer);
    }

    p {
      margin-top: 0.15rem;
      font-size: 0.85rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--ink-dimmer);
    }
  }

  .hud-actions {
    display: flex;
    gap: 0.5rem;
  }

  .hud-button {
    padding: 0.55rem 1.15rem;
    font-weight: 700;
    font-size: 0.85rem;
    letter-spacing: 0.05em;
    cursor: pointer;
    text-decoration: none;

    &:disabled {
      opacity: 0.35;
      cursor: not-allowed;

      &:hover {
        background: var(--glass-bg);
        border-color: var(--glass-border);
      }
    }

    &:active:not(:disabled) {
      transform: translateY(1px);
    }
  }

  .platforms {
    display: flex;
    justify-content: center;
    gap: clamp(0.4rem, 2vw, 1.25rem);
  }

  .ghost {
    position: fixed;
    z-index: 50;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.3rem;
    pointer-events: none;
  }

  .burst-anchor {
    position: fixed;
    z-index: 60;
    width: 0;
    height: 0;
    pointer-events: none;
  }

  .win-overlay {
    position: fixed;
    inset: 0;
    z-index: 100;
    display: grid;
    place-items: center;
    background: rgba(7, 10, 22, 0.62);
    backdrop-filter: blur(7px);
    animation: fadeIn 0.45s ease;
  }

  .win-panel {
    padding: 2.6rem 3rem;
    text-align: center;
    animation: riseIn 0.55s cubic-bezier(0.25, 1.4, 0.4, 1) both;

    h2 {
      margin: 0;
      font-family: "Marcellus", serif;
      font-size: 2.2rem;
      font-weight: 400;
      letter-spacing: 0.03em;
      background: linear-gradient(180deg, var(--gold-1), var(--gold-btn-2));
      background-clip: text;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    p {
      margin: 0.6rem 0 1.5rem;
      font-size: 0.95rem;
      color: var(--ink-dim);
    }
  }

  .win-eyebrow {
    font-family: "Marcellus", serif;
    font-size: 0.8rem;
    letter-spacing: 0.35em;
    text-indent: 0.35em;
    text-transform: uppercase;
    color: rgba(255, 225, 170, 0.6);
    margin-bottom: 0.5rem;
  }

  .win-actions {
    display: flex;
    justify-content: center;
    gap: 0.75rem;
  }

  @media (prefers-reduced-motion: reduce) {
    .win-overlay,
    .win-panel {
      animation: none;
    }
  }
</style>
