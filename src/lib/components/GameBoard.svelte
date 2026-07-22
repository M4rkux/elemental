<script lang="ts">
  import { GameEngine } from "$lib/game/engine.svelte";
  import {
    completeSound,
    grabSound,
    revealSound,
    stoneBreakSound,
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
    // Press-start point; compared against release point to tell a drag from a click.
    startX: number;
    startY: number;
  }

  interface Selected {
    from: number;
    index: number;
    group: Element[];
  }

  interface Flight {
    from: number;
    index: number;
    group: Element[];
    target: number;
    x: number;
    y: number;
  }

  // How long a click-placed group takes to fly from its rope to the target.
  const FLIGHT_MS = 220;

  // A pointer move past this many px counts as a drag, not a click.
  const CLICK_THRESHOLD = 6;

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
    stoneBreakSound.preload();
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

  // A stone seal breaks all at once (unlike a single mystery reveal): the
  // rock flashes, shards fly (0.7s) and the ring burst lands last (0.15s
  // delay + 0.9s) — matches the .stone-rock/.shard/.stone-ring keyframes in
  // Platform.svelte. The real elements underneath are already there to see
  // once it clears.
  const STONE_BREAK_MS = 1050;
  let breakingStone = $state<number | null>(null);

  $effect(() => {
    const platform = engine.lastStoneBreak;
    if (platform === null) return;
    breakingStone = platform;
    void stoneBreakSound.play();
    const timer = setTimeout(() => {
      breakingStone = null;
      engine.lastStoneBreak = null;
    }, STONE_BREAK_MS);
    return () => {
      clearTimeout(timer);
      breakingStone = null;
    };
  });

  // On entry (and restart, which remounts the board) the elements cascade
  // down their ropes. The window covers the last stagger delay + drop time;
  // afterwards the entrance class is dropped so later re-renders stay still.
  const CASCADE_MS = 1600;
  let cascading = $state(true);

  $effect(() => {
    const timer = setTimeout(() => (cascading = false), CASCADE_MS);
    return () => clearTimeout(timer);
  });

  let drag = $state<Drag | null>(null);
  // Click-to-move: tapping a piece pops it instead of dragging it; a second
  // tap on a platform (or the same piece, or empty space) resolves it.
  let selected = $state<Selected | null>(null);
  // A group animating from its rope to a clicked target; not a real drag,
  // just a tween, so it gets its own state rather than reusing `drag`.
  let flight = $state<Flight | null>(null);
  let flying = $state(false);
  let dropTarget = $state<number | null>(null);
  let platformEls: (HTMLElement | undefined)[] = $state([]);
  // Press-start point for clicks that land outside any pickable slot (empty
  // rope, locked platform, background) — grab() never fires there, so this
  // is the only record of where the gesture began.
  let downX = 0;
  let downY = 0;

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
  const SLOT_REM = 4; // piece (3.25) + gap (0.75)
  const PIECE_REM = 3.25; // ElementPiece's --element-size default

  /** Screen position a slot's piece (top-left, matching the ghost's anchor) sits at. */
  function slotTopLeft(
    platform: number,
    index: number,
  ): { x: number; y: number } {
    const el = platformEls[platform];
    if (!el) return { x: 0, y: 0 };
    const rect = el.getBoundingClientRect();
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const half = (PIECE_REM / 2) * rem;
    return {
      x: rect.left + rect.width / 2 - half,
      y: rect.top + (BASE_REM + (index + 0.5) * SLOT_REM) * rem - half,
    };
  }

  /**
   * Click-to-move has no cursor to carry the ghost, so it flies one instead:
   * a short tween from the source slot to the landing slot, then the move
   * actually commits. Mirrors what a real drag-drop looks like on release.
   */
  function flyToPlacement(
    from: number,
    index: number,
    group: Element[],
    target: number,
  ) {
    const start = slotTopLeft(from, index);
    flight = { from, index, group, target, x: start.x, y: start.y };
    flying = false;
    requestAnimationFrame(() => {
      if (!flight) return;
      const end = slotTopLeft(target, engine.platforms[target].length);
      flying = true;
      flight.x = end.x;
      flight.y = end.y;
    });
    setTimeout(() => {
      if (!flight) return;
      const landed = flight;
      flight = null;
      flying = false;
      tryPlace(landed.from, landed.index, landed.group, landed.target);
    }, FLIGHT_MS);
  }

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
    // Already holding a piece elsewhere: if this platform is a valid landing
    // spot, clicking one of its pieces places the floating group there
    // instead of swapping the selection to whatever was just clicked. No
    // drag starts; the click falls through to onPointerUp's plain-click path,
    // which resolves the target from these same coordinates.
    if (
      selected &&
      selected.from !== platform &&
      engine.canDrop(platform, selected.group[0], selected.group.length)
    ) {
      return;
    }
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    drag = {
      from: platform,
      index,
      group: engine.groupAt(platform, index),
      x: event.clientX,
      y: event.clientY,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      startX: event.clientX,
      startY: event.clientY,
    };
    dropTarget = null;
    void grabSound.grab(drag.group[0]);
  }

  function targetAt(
    x: number,
    y: number,
    excludeFrom: number | null,
  ): number | null {
    for (let i = 0; i < platformEls.length; i++) {
      const el = platformEls[i];
      if (!el || i === excludeFrom) continue;
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

  // Pointermove can fire well above 60Hz (high-poll-rate mice, touch); a
  // $state write per event forces a reactive update the display can't even
  // show. Coalesce to one write per animation frame instead.
  let rafPending = false;
  let pendingX = 0;
  let pendingY = 0;

  function onGlobalPointerDown(event: PointerEvent) {
    downX = event.clientX;
    downY = event.clientY;
  }

  function onPointerMove(event: PointerEvent) {
    // Hover-highlight runs during a real drag AND while a click-selected
    // piece is waiting to be placed — same targeting, no cursor to follow.
    if (!drag && !selected) return;
    pendingX = event.clientX;
    pendingY = event.clientY;
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(() => {
      rafPending = false;
      if (drag) {
        drag.x = pendingX;
        drag.y = pendingY;
        dropTarget = targetAt(pendingX, pendingY, drag.from);
      } else if (selected) {
        dropTarget = targetAt(pendingX, pendingY, selected.from);
      }
    });
  }

  /** Places `group` on `target` if valid, with the shared drop feedback (burst/sound). */
  function tryPlace(
    from: number,
    index: number,
    group: Element[],
    target: number | null,
  ) {
    if (target === null || !engine.move(from, index, target)) return;
    spawnBurst(target, group[0], group.length);
    void tapSound.play();
    // Complete platforms reject drops, so completeness here means the
    // move just sealed the platform.
    if (engine.isComplete(target)) {
      void completeSound.play(group[0]);
    }
  }

  function onPointerUp(event: PointerEvent) {
    if (drag) {
      const moved =
        Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) >
        CLICK_THRESHOLD;
      if (moved) {
        // Real drag-drop: the ghost is already sitting at the drop point.
        grabSound.release();
        tryPlace(drag.from, drag.index, drag.group, dropTarget);
        selected = null;
      } else if (
        selected?.from === drag.from &&
        selected?.index === drag.index
      ) {
        // Clicking the already-selected piece again lowers it back.
        grabSound.release();
        selected = null;
      } else {
        // Pop it: parked in place until the next click resolves it. Keep
        // the grab sound looping, same as it does through a held drag.
        selected = { from: drag.from, index: drag.index, group: drag.group };
      }
      drag = null;
      dropTarget = null;
      return;
    }

    // No slot was pressed (empty rope, locked platform, background) — the
    // only thing a plain click can do here is resolve a pending selection.
    if (!selected) return;
    const moved =
      Math.hypot(event.clientX - downX, event.clientY - downY) >
      CLICK_THRESHOLD;
    if (moved) return; // swipe/scroll gesture, not a tap — leave the selection popped
    grabSound.release();
    const target = targetAt(event.clientX, event.clientY, selected.from);
    if (
      target !== null &&
      engine.canDrop(target, selected.group[0], selected.group.length)
    ) {
      flyToPlacement(selected.from, selected.index, selected.group, target);
    }
    selected = null;
    dropTarget = null;
  }

  function dropStateFor(platform: number): "valid" | "invalid" | null {
    const group = drag?.group ?? selected?.group;
    if (!group || dropTarget !== platform) return null;
    return engine.canDrop(platform, group[0], group.length)
      ? "valid"
      : "invalid";
  }

  // At most 5 platforms fit one row; bigger boards split evenly across two
  // (8 → 4 + 4, 7 → 4 + 3).
  const MAX_PLATFORMS_PER_ROW = 5;
  let platformRows = $derived.by(() => {
    const indexes = engine.platforms.map((_, i) => i);
    if (indexes.length <= MAX_PLATFORMS_PER_ROW) return [indexes];
    const first = Math.ceil(indexes.length / 2);
    return [indexes.slice(0, first), indexes.slice(first)];
  });
</script>

<svelte:window
  onpointerdown={onGlobalPointerDown}
  onpointermove={onPointerMove}
  onpointerup={onPointerUp}
  onpointercancel={onPointerUp}
/>

<div
  class="board"
  class:board--dragging={drag !== null}
  class:board--selecting={selected !== null}
>
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
    {#each platformRows as row, r (r)}
      <div class="platform-row">
        {#each row as i (i)}
          <Platform
            type={engine.platformTypes[i]}
            slots={engine.platforms[i]}
            maxPerPlatform={engine.maxPerPlatform}
            complete={engine.isComplete(i)}
            lockedCount={engine.lockedCount(i)}
            cascadeOrder={cascading ? i : null}
            pickable={(index) =>
              !drag && !engine.won && engine.canPick(i, index)}
            hiddenFrom={drag?.from === i
              ? drag.index
              : flight?.from === i
                ? flight.index
                : null}
            poppedFrom={selected?.from === i ? selected.index : null}
            maskedIndex={maskedReveal?.platform === i
              ? maskedReveal.index
              : null}
            revealingIndex={activeReveal?.platform === i
              ? activeReveal.index
              : null}
            dropState={dropStateFor(i)}
            stoneElement={engine.stoneSecret[i]}
            sealed={engine.isSealed(i)}
            stoneBreaking={breakingStone === i}
            onGrab={(index, event) => grab(i, index, event)}
            bind:el={platformEls[i]}
          />
        {/each}
      </div>
    {/each}
  </div>

  {#if drag}
    <div
      class="ghost"
      style:transform="translate3d({drag.x - drag.offsetX}px, {drag.y -
        drag.offsetY}px, 0)"
    >
      {#each drag.group as element, i (i)}
        <ElementPiece {element} grabbed />
      {/each}
    </div>
  {:else if flight}
    <div
      class="ghost"
      style:transform="translate3d({flight.x}px, {flight.y}px, 0)"
      style:transition={flying
        ? `transform ${FLIGHT_MS}ms cubic-bezier(0.3, 0, 0.2, 1)`
        : "none"}
    >
      {#each flight.group as element, i (i)}
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

    &--selecting {
      cursor: pointer;
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
    flex-direction: column;
    align-items: center;
    gap: 1.5rem;
    // Drag highlight (platform--valid/invalid) repaints one platform per
    // pointer move; contain stops that repaint/layout work from spreading
    // to siblings. Safe here (unlike on .board) since .ghost is a sibling,
    // not a descendant, so its position:fixed stays viewport-relative.
    contain: layout style paint;
  }

  .platform-row {
    display: flex;
    justify-content: space-evenly;
    width: 100%;
  }

  .ghost {
    position: fixed;
    top: 0;
    left: 0;
    z-index: 50;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    pointer-events: none;
    // transform instead of top/left: moves compositor-only, skips layout.
    will-change: transform;
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
