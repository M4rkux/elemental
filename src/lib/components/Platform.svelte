<script lang="ts">
  import ElementIcon from "./ElementIcon.svelte";
  import ElementPiece from "./ElementPiece.svelte";
  import type { ElementSlot, PlatformType } from "$lib/game/types";

  let {
    type,
    slots,
    maxPerPlatform,
    complete,
    lockedCount = 0,
    pickable,
    hiddenFrom = null,
    maskedIndex = null,
    revealingIndex = null,
    cascadeOrder = null,
    dropState = null,
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
    /** Slot already revealed in the engine but still showing its mystery face (pre-reveal beat). */
    maskedIndex?: number | null;
    /** Slot whose mystery element was just revealed; plays the spin-in + burst ring. */
    revealingIndex?: number | null;
    /** While the board entrance plays, this platform's position in the stagger; null once settled. */
    cascadeOrder?: number | null;
    dropState?: "valid" | "invalid" | null;
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
        class:slot--pickable={pickable(i)}
        class:slot--revealing={revealingIndex === i}
        class:slot--entering={cascadeOrder !== null}
        style:--cascade-delay={cascadeOrder !== null
          ? `${(cascadeOrder * 3 + i) * 55}ms`
          : null}
        style:--cascade-drop={cascadeOrder !== null ? `${i * 4 + 0.5}rem` : null}
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
        />
        {#if revealingIndex === i}
          <span class="burst-ring"></span>
        {/if}
      </button>
    {/each}
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

    &--pickable {
      cursor: grab;
    }

    &--lifted {
      visibility: hidden;
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
    .burst-ring {
      display: none;
    }
  }
</style>
