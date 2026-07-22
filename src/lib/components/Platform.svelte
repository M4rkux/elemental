<script lang="ts">
  import ElementIcon from "./ElementIcon.svelte";
  import ElementPiece from "./ElementPiece.svelte";
  import type { Element, ElementSlot, PlatformType } from "$lib/game/types";

  let {
    type,
    slots,
    maxPerPlatform,
    complete,
    lockedCount = 0,
    pickable,
    hiddenFrom = null,
    poppedFrom = null,
    maskedIndex = null,
    revealingIndex = null,
    cascadeOrder = null,
    dropState = null,
    stoneElement = null,
    sealed = false,
    stoneBreaking = false,
    onGrab,
    el = $bindable(),
  }: {
    type: PlatformType;
    slots: ElementSlot[];
    maxPerPlatform: number;
    complete: boolean;
    /** Elements from the top that are locked on a restricted platform (already in the right place). */
    lockedCount?: number;
    pickable: (index: number) => boolean;
    /** While a drag is in progress, elements from this index down are lifted off the rope. */
    hiddenFrom?: number | null;
    /** Click-to-move: elements from this index down are popped in place, awaiting a placement tap. */
    poppedFrom?: number | null;
    /** Slot already revealed in the engine but still showing its mystery face (pre-reveal beat). */
    maskedIndex?: number | null;
    /** Slot whose mystery element was just revealed; plays the spin-in + burst ring. */
    revealingIndex?: number | null;
    /** While the board entrance plays, this platform's position in the stagger; null once settled. */
    cascadeOrder?: number | null;
    dropState?: "valid" | "invalid" | null;
    /** Element that must be completed elsewhere to break this platform's stone seal, if any. */
    stoneElement?: Element | null;
    /** Whole rope is still covered by a stone; can't be picked from or dropped onto. */
    sealed?: boolean;
    /** Plays the one-shot shatter animation as the stone seal just broke. */
    stoneBreaking?: boolean;
    onGrab: (index: number, event: PointerEvent) => void;
    el?: HTMLElement;
  } = $props();

  // The color a completed platform (base and rope) fills with.
  let completeTint = $derived(
    complete && slots.length > 0 ? `var(--element-${slots[0].element})` : null,
  );
</script>

<div
  class="platform"
  class:platform--valid={dropState === "valid"}
  class:platform--invalid={dropState === "invalid"}
  class:platform--complete={complete}
  style:--slots={maxPerPlatform}
  style:--complete-tint={completeTint}
  bind:this={el}
>
  <div
    class="base"
    class:base--complete={complete}
    class:base--tinted={type !== "neutral"}
    class:base--earth={type === "earth"}
    class:base--fire={type === "fire"}
    class:base--water={type === "water"}
    class:base--air={type === "air"}
  >
    {#if type !== "neutral"}
      <span class="badge" title="Must be completed with {type}">
        <ElementIcon element={type} />
      </span>
    {/if}
  </div>

  <div class="rope-area">
    <div class="rope"></div>
    {#each slots as slot, i (i)}
      <button
        type="button"
        class="slot"
        class:slot--lifted={hiddenFrom !== null && i >= hiddenFrom}
        class:slot--popped={poppedFrom !== null && i >= poppedFrom}
        class:slot--pickable={pickable(i)}
        class:slot--revealing={revealingIndex === i}
        class:slot--entering={cascadeOrder !== null}
        style:--cascade-delay={cascadeOrder !== null
          ? `${(cascadeOrder * 3 + i) * 55}ms`
          : null}
        style:--cascade-drop={cascadeOrder !== null
          ? `${i * 4 + 0.5}rem`
          : null}
        aria-label={slot.revealed
          ? `${slot.element} element`
          : "mystery element"}
        onpointerdown={(e) => onGrab(i, e)}
      >
        <ElementPiece
          element={slot.revealed && maskedIndex !== i
            ? slot.element
            : "mystery"}
          complete={complete || i < lockedCount}
          grabbed={poppedFrom !== null && i >= poppedFrom}
        />
        {#if revealingIndex === i}
          <span class="burst-ring"></span>
        {/if}
      </button>
    {/each}

    {#if sealed || stoneBreaking}
      <div class="stone-seal">
        <div class="stone-rock" class:stone-rock--breaking={stoneBreaking}>
          <svg
            class="stone-embers"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <polyline
              class="ember"
              points="8,22 28,30 22,48 44,54 38,74 58,70"
            />
            <polyline
              class="ember ember--2"
              points="54,8 62,26 80,29 72,48 90,53"
            />
            <polyline class="ember ember--3" points="20,60 36,66 30,84 50,90" />
          </svg>
        </div>

        {#if stoneBreaking}
          <div class="stone-shards" aria-hidden="true">
            <span class="shard shard--1"></span>
            <span class="shard shard--2"></span>
            <span class="shard shard--3"></span>
            <span class="shard shard--4"></span>
            <span class="shard shard--5"></span>
            <span class="shard shard--6"></span>
            <span class="shard shard--7"></span>
            <span class="stone-flash"></span>
            <span class="stone-ring"></span>
          </div>
        {/if}

        <span
          class="stone-badge"
          class:stone-badge--earth={stoneElement === "earth"}
          class:stone-badge--fire={stoneElement === "fire"}
          class:stone-badge--water={stoneElement === "water"}
          class:stone-badge--air={stoneElement === "air"}
          title="Breaks when {stoneElement} is completed elsewhere"
        >
          <ElementIcon element={stoneElement ?? "mystery"} />
        </span>
      </div>
    {/if}
  </div>
</div>

<style lang="scss">
  .platform {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: clamp(4.5rem, 17vw, 6.5rem);
    border-radius: 12px;
    transition: background-color 120ms ease;

    &--valid {
      background: rgba(255, 240, 190, 0.15);
      box-shadow: 0 0 0 3px rgba(255, 235, 170, 0.45);
    }

    &--invalid {
      background: rgba(217, 59, 37, 0.15);
    }

    &--complete .rope-area {
      filter: saturate(1.15) brightness(1.05);
    }

    &--complete .base {
      animation: sealGlow 1.2s ease;
    }

    // Once the base fill lands, the color continues sweeping down the rope.
    &--complete .rope::after {
      content: "";
      position: absolute;
      inset: 0;
      border-radius: inherit;
      background: var(--complete-tint);
      animation: fill-down 450ms ease-in 250ms both;
    }
  }

  .base {
    position: relative;
    width: 100%;
    height: 1.9rem;
    z-index: 1;
    border-radius: 11px;
    background: linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.13),
      rgba(255, 255, 255, 0.03)
    );
    border: 1px solid var(--glass-border);
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35);

    // Element-restricted platforms are tinted with their element's color.
    &--tinted {
      border-color: var(--tint);
    }
    &--tinted::after {
      content: "";
      position: absolute;
      inset: 0;
      border-radius: inherit;
      background: var(--tint);
      opacity: 0.25;
    }

    &--earth {
      --tint: var(--element-earth);
      --badge-light: var(--element-earth-light);
      --badge-mid: var(--element-earth);
    }
    &--fire {
      --tint: var(--element-fire);
      --badge-light: var(--element-fire-light);
      --badge-mid: var(--element-fire);
    }
    &--water {
      --tint: var(--element-water);
      --badge-light: var(--element-water-light);
      --badge-mid: var(--element-water);
    }
    &--air {
      --tint: var(--element-air-light);
      --badge-light: var(--element-air-light);
      --badge-mid: var(--element-air);
    }

    // Completed platforms fill with the element's color and look pressed
    // in: the base's top light is swapped for an inner shadow. The fill
    // sweeps top to bottom before continuing down the rope. It lives in
    // ::before (::after holds the restricted tint) so the badge, a later
    // sibling with the same z-index, still paints on top.
    &--complete {
      border-color: rgba(255, 215, 130, 0.6);
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.45);

      &::before {
        content: "";
        position: absolute;
        inset: 0;
        z-index: 1;
        border-radius: inherit;
        background: var(--complete-tint);
        box-shadow:
          inset 0 4px 8px rgba(0, 0, 0, 0.45),
          inset 0 -2px 4px rgba(0, 0, 0, 0.2);
        animation: fill-down 250ms ease-out both;
      }
    }
  }

  @keyframes sealGlow {
    0% {
      box-shadow: 0 0 0 0 rgba(255, 215, 130, 0);
    }
    35% {
      box-shadow: 0 0 28px 6px rgba(255, 210, 120, 0.55);
    }
    100% {
      box-shadow: 0 0 0 0 rgba(255, 210, 120, 0);
    }
  }

  // Reveals the element color from top to bottom.
  @keyframes fill-down {
    from {
      clip-path: inset(0 0 100% 0);
    }
    to {
      clip-path: inset(0 0 0 0);
    }
  }

  // A small solid orb keeps the restriction glyph readable on the glass base.
  .badge {
    position: absolute;
    top: 50%;
    left: 50%;
    translate: -50% -50%;
    z-index: 1;
    width: 1.5rem;
    height: 1.5rem;
    --icon-size: 78%;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: radial-gradient(
      circle at 35% 30%,
      var(--badge-light),
      var(--badge-mid) 70%
    );
    box-shadow:
      0 2px 6px rgba(0, 0, 0, 0.45),
      inset 0 -2px 4px rgba(0, 0, 0, 0.25),
      inset 0 2px 3px rgba(255, 255, 255, 0.25);
  }

  .rope-area {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    padding-top: 0.35rem;
    min-height: calc(var(--slots) * 3.75rem + 1rem);
    width: 100%;
  }

  .rope {
    position: absolute;
    top: 0.15rem;
    bottom: 1rem;
    width: 3px;
    background: repeating-linear-gradient(
      180deg,
      var(--rope-color) 0 6px,
      rgba(200, 215, 255, 0.08) 6px 12px
    );
    border-radius: 2px;
    box-shadow: 0 0 8px var(--rope-glow);
  }

  .slot {
    position: relative;
    padding: 0;
    border: none;
    background: none;
    display: flex;
    touch-action: none;
    cursor: default;
    transition: transform 180ms cubic-bezier(0.25, 1.4, 0.4, 1);

    &--pickable {
      cursor: grab;
    }

    &--lifted {
      visibility: hidden;
    }

    // Click-to-move: popped in place, waiting for a placement tap.
    &--popped {
      transform: translateY(-0.6rem);
      z-index: 2;
    }

    &--revealing {
      animation: reveal 0.75s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    // Entrance: each element fades in at the top of the rope and drops down
    // to its slot. --cascade-drop is the distance from the rope top
    // (slot stride: 3.25rem piece + 0.75rem gap); --cascade-delay staggers
    // across platforms and slots. `both` keeps it hidden until its turn.
    &--entering {
      animation: cascade-drop 0.42s cubic-bezier(0.22, 1, 0.36, 1)
        var(--cascade-delay, 0ms) both;
    }
  }

  @keyframes cascade-drop {
    from {
      opacity: 0;
      transform: translateY(calc(-1 * var(--cascade-drop, 0rem)));
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  // A whole rope sealed under a single rock, badged with the element that
  // breaks it elsewhere. Rock shape, embers and shatter physics mirror the
  // "Stone shattering animation" design reference. Covers the individual
  // (mystery) slots underneath completely so the column reads as one thing.
  .stone-seal {
    position: absolute;
    inset: 0;
    z-index: 3;
  }

  .stone-rock {
    position: absolute;
    inset: 0;
    z-index: 1;
    clip-path: polygon(
      8% 2%,
      55% 0%,
      92% 6%,
      100% 30%,
      96% 55%,
      100% 80%,
      85% 100%,
      45% 98%,
      12% 100%,
      0% 75%,
      4% 45%,
      0% 18%
    );
    background:
      radial-gradient(
        circle at 28% 18%,
        rgba(255, 255, 255, 0.16),
        transparent 42%
      ),
      radial-gradient(circle at 72% 68%, rgba(0, 0, 0, 0.35), transparent 46%),
      linear-gradient(160deg, #5a4d3e, #372c22 45%, #1e160f 100%);
    filter: drop-shadow(0 6px 10px rgba(0, 0, 0, 0.5));
    transform-origin: 50% 50%;
    animation: rock-idle 4.5s ease-in-out infinite;

    &--breaking {
      animation: rock-break-flash 0.5s ease-out forwards;
    }
  }

  .stone-embers {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }

  .ember {
    fill: none;
    stroke: rgba(255, 140, 70, 0.85);
    stroke-width: 1.6;
    stroke-linecap: round;
    filter: drop-shadow(0 0 4px rgba(255, 120, 60, 0.85));
    animation: ember-pulse 2.3s ease-in-out infinite;

    &--2 {
      stroke: rgba(255, 140, 70, 0.6);
      stroke-width: 1.3;
      animation-duration: 2.7s;
      animation-delay: 0.5s;
    }

    &--3 {
      stroke: rgba(255, 140, 70, 0.55);
      stroke-width: 1.2;
      animation-duration: 3.1s;
      animation-delay: 1s;
    }
  }

  .stone-shards {
    position: absolute;
    inset: 0;
    z-index: 2;
  }

  .shard {
    position: absolute;
    inset: 0;
    background:
      radial-gradient(
        circle at 28% 18%,
        rgba(255, 255, 255, 0.16),
        transparent 42%
      ),
      radial-gradient(circle at 72% 68%, rgba(0, 0, 0, 0.35), transparent 46%),
      linear-gradient(160deg, #5a4d3e, #372c22 45%, #1e160f 100%);
    filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.5));
    animation-duration: 0.7s;
    animation-timing-function: cubic-bezier(0.3, 0.6, 0.4, 1);
    animation-fill-mode: forwards;

    &--1 {
      clip-path: polygon(8% 2%, 55% 0%, 40% 35%, 15% 45%, 0% 30%);
      animation-name: shard-fly-1;
    }
    &--2 {
      clip-path: polygon(55% 0%, 92% 6%, 100% 30%, 70% 40%, 40% 35%);
      animation-name: shard-fly-2;
    }
    &--3 {
      clip-path: polygon(100% 30%, 96% 55%, 75% 68%, 70% 40%);
      animation-name: shard-fly-3;
    }
    &--4 {
      clip-path: polygon(0% 30%, 15% 45%, 35% 60%, 25% 75%, 0% 60%);
      animation-name: shard-fly-4;
    }
    &--5 {
      clip-path: polygon(15% 45%, 40% 35%, 70% 40%, 75% 68%, 50% 78%, 35% 60%);
      animation-name: shard-fly-5;
    }
    &--6 {
      clip-path: polygon(
        75% 68%,
        96% 55%,
        100% 80%,
        85% 100%,
        45% 98%,
        50% 78%
      );
      animation-name: shard-fly-6;
    }
    &--7 {
      clip-path: polygon(0% 60%, 25% 75%, 35% 60%, 50% 78%, 12% 100%, 0% 75%);
      animation-name: shard-fly-7;
    }
  }

  @keyframes shard-fly-1 {
    to {
      transform: translate(-68px, -92px) rotate(-150deg);
      opacity: 0;
    }
  }
  @keyframes shard-fly-2 {
    to {
      transform: translate(6px, -118px) rotate(170deg);
      opacity: 0;
    }
  }
  @keyframes shard-fly-3 {
    to {
      transform: translate(88px, -70px) rotate(210deg);
      opacity: 0;
    }
  }
  @keyframes shard-fly-4 {
    to {
      transform: translate(-104px, 8px) rotate(-210deg);
      opacity: 0;
    }
  }
  @keyframes shard-fly-5 {
    to {
      transform: translate(84px, 26px) rotate(190deg);
      opacity: 0;
    }
  }
  @keyframes shard-fly-6 {
    to {
      transform: translate(58px, 104px) rotate(230deg);
      opacity: 0;
    }
  }
  @keyframes shard-fly-7 {
    to {
      transform: translate(-62px, 102px) rotate(-190deg);
      opacity: 0;
    }
  }

  .stone-flash {
    position: absolute;
    left: 50%;
    top: 50%;
    width: 150px;
    height: 150px;
    margin: -75px 0 0 -75px;
    border-radius: 50%;
    background: radial-gradient(
      circle,
      rgba(255, 235, 200, 0.95),
      rgba(255, 140, 60, 0.55) 40%,
      transparent 72%
    );
    animation: stone-flash-burst 0.5s ease-out forwards;
    pointer-events: none;
  }

  .stone-ring {
    position: absolute;
    left: 50%;
    top: 50%;
    width: 3.6rem;
    height: 3.6rem;
    margin: -1.8rem 0 0 -1.8rem;
    border: 3px solid rgba(255, 180, 120, 0.9);
    border-radius: 50%;
    animation: stone-ring-burst 0.9s ease-out 0.15s both;
    pointer-events: none;
  }

  // Just the symbol, carved into the rock — not a floating badge. A tight
  // colored glow plus a dark contact shadow keep it readable against the
  // rock's texture whatever the underlying gradient looks like there.
  .stone-badge {
    position: absolute;
    left: 50%;
    top: 40%;
    transform: translate(-50%, -50%);
    z-index: 3;
    width: 2.6rem;
    height: 2.6rem;
    --icon-size: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: badge-glow 2.4s ease-in-out infinite;

    &--earth {
      --badge-glow: var(--element-earth-glow);
    }
    &--fire {
      --badge-glow: var(--element-fire-glow);
    }
    &--water {
      --badge-glow: var(--element-water-glow);
    }
    &--air {
      --badge-glow: var(--element-air-glow);
    }
  }

  @keyframes rock-idle {
    0%,
    100% {
      transform: rotate(0deg) translate(0, 0);
    }
    30% {
      transform: rotate(-0.4deg) translate(-0.5px, 0.3px);
    }
    70% {
      transform: rotate(0.3deg) translate(0.5px, -0.3px);
    }
  }

  @keyframes rock-break-flash {
    0% {
      filter: brightness(1) drop-shadow(0 6px 10px rgba(0, 0, 0, 0.5));
      opacity: 1;
    }
    25% {
      filter: brightness(2.6) drop-shadow(0 6px 10px rgba(0, 0, 0, 0.5));
    }
    100% {
      filter: brightness(1.4) drop-shadow(0 6px 10px rgba(0, 0, 0, 0.5));
      opacity: 0;
    }
  }

  @keyframes ember-pulse {
    0%,
    100% {
      opacity: 0.5;
    }
    50% {
      opacity: 1;
    }
  }

  @keyframes stone-flash-burst {
    0% {
      transform: scale(0.2);
      opacity: 1;
    }
    100% {
      transform: scale(3.4);
      opacity: 0;
    }
  }

  @keyframes stone-ring-burst {
    0% {
      transform: scale(0.4);
      opacity: 0;
    }
    15% {
      opacity: 0.9;
    }
    100% {
      transform: scale(2.8);
      opacity: 0;
    }
  }

  @keyframes badge-glow {
    0%,
    100% {
      filter: drop-shadow(
          0 0 3px var(--badge-glow, var(--element-mystery-glow))
        )
        drop-shadow(0 0 3px var(--badge-glow, var(--element-mystery-glow)))
        drop-shadow(0 2px 2px rgba(0, 0, 0, 0.75));
    }
    50% {
      filter: drop-shadow(
          0 0 8px var(--badge-glow, var(--element-mystery-glow))
        )
        drop-shadow(0 0 8px var(--badge-glow, var(--element-mystery-glow)))
        drop-shadow(0 2px 2px rgba(0, 0, 0, 0.75));
    }
  }

  .burst-ring {
    position: absolute;
    inset: -5px;
    border: 3px solid rgba(255, 215, 140, 0.9);
    border-radius: 50%;
    animation: burst 0.8s ease-out forwards;
    pointer-events: none;
  }

  @keyframes reveal {
    0% {
      transform: scale(0.3) rotate(-170deg);
      filter: brightness(3);
    }
    55% {
      transform: scale(1.18) rotate(8deg);
    }
    100% {
      transform: scale(1) rotate(0);
    }
  }

  @keyframes burst {
    0% {
      transform: scale(0.5);
      opacity: 0.95;
    }
    100% {
      transform: scale(2.4);
      opacity: 0;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .slot--revealing,
    .slot--entering {
      animation: none;
    }
    .slot {
      transition: none;
    }
    .stone-rock {
      animation: none;
    }
    .stone-rock--breaking {
      animation: none;
      opacity: 0;
    }
    .ember,
    .stone-badge {
      animation: none;
    }
    .shard,
    .stone-flash,
    .stone-ring {
      display: none;
    }
    .burst-ring {
      display: none;
    }
  }
</style>
