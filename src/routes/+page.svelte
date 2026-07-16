<script lang="ts">
  import ElementIcon from "$lib/components/ElementIcon.svelte";
  import { progress } from "$lib/game/progress.svelte";
  import { ELEMENTS, type Element } from "$lib/game/types";

  let { data } = $props();

  let playTarget = $derived(progress.firstUnfinished(data.levelNumbers));

  // Each element idles with its own signature motion, matching how it
  // animates when picked up mid-game.
  const IDLE_ANIM: Record<Element, string> = {
    earth: "breathe 4.5s ease-in-out infinite",
    fire: "flicker 2.4s ease-in-out infinite",
    water: "ripple 3.4s ease-in-out infinite",
    air: "shimmer 3.8s ease-in-out infinite",
  };
</script>

<svelte:head>
  <title>Elemental</title>
</svelte:head>

<main class="menu">
  <div class="icons">
    {#each ELEMENTS as element (element)}
      <div
        class="orb"
        style:background="radial-gradient(circle at 35% 30%, var(--element-{element}-light),
        var(--element-{element}) 70%)"
        style:box-shadow="0 6px 16px rgba(0,0,0,.45), 0 0 20px var(--element-{element}-glow),
        inset 0 -6px 12px rgba(0,0,0,.25), inset 0 4px 8px rgba(255,255,255,.25)"
        style:animation={IDLE_ANIM[element]}
      >
        <ElementIcon {element} />
      </div>
    {/each}
  </div>

  <div class="title-block">
    <h1>Elemental</h1>
    <p class="tagline">Restore the balance</p>
  </div>

  <div class="cta">
    <a class="play gold-pill" href="/play/{playTarget}">
      <span class="play-label">Play</span>
      <span class="play-level">Level {playTarget}</span>
    </a>
  </div>
</main>

<style lang="scss">
  .menu {
    position: relative;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2.1rem;
    padding: 2.5rem 1.25rem;
    text-align: center;
    animation: fadeIn 0.5s ease;
  }

  .icons {
    display: flex;
    gap: 1.4rem;
    align-items: center;
    animation: riseIn 0.7s ease both;
  }

  .orb {
    width: 3.5rem;
    height: 3.5rem;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    --icon-size: 62%;
  }

  .title-block {
    animation: riseIn 0.7s ease 0.12s both;

    h1 {
      margin: 0;
      font-family: "Marcellus", serif;
      font-weight: 400;
      font-size: clamp(2.9rem, 9vw, 6rem);
      letter-spacing: 0.2em;
      text-indent: 0.2em;
      background: linear-gradient(
        180deg,
        var(--gold-1) 20%,
        var(--gold-2) 55%,
        var(--gold-3) 95%
      );
      background-clip: text;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      animation: titleGlow 4s ease-in-out infinite;
    }
  }

  .tagline {
    margin: 0.9rem 0 0;
    font-size: 1.05rem;
    letter-spacing: 0.26em;
    text-indent: 0.26em;
    text-transform: uppercase;
    color: var(--ink-dim);
  }

  .cta {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    animation: riseIn 0.7s ease 0.24s both;
  }

  .play {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.15rem;
    padding: 1rem 3.6rem;
    text-decoration: none;
  }

  .play-label {
    font-size: 1.25rem;
  }

  .play-level {
    font-size: 0.8rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    opacity: 0.7;
  }

  @keyframes titleGlow {
    0%,
    100% {
      text-shadow: 0 0 26px rgba(255, 214, 150, 0.35);
    }
    50% {
      text-shadow: 0 0 44px rgba(255, 214, 150, 0.65);
    }
  }

  @keyframes breathe {
    0%,
    100% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.035);
      filter: brightness(1.07);
    }
  }

  @keyframes flicker {
    0%,
    100% {
      transform: scale(1);
      filter: brightness(1);
    }
    45% {
      transform: scale(1.045, 0.97);
      filter: brightness(1.22);
    }
    70% {
      transform: scale(0.98, 1.03);
      filter: brightness(1.08);
    }
  }

  @keyframes ripple {
    0%,
    100% {
      transform: translateY(0);
      filter: brightness(1);
    }
    50% {
      transform: translateY(-3px);
      filter: brightness(1.12);
    }
  }

  @keyframes shimmer {
    0%,
    100% {
      filter: brightness(1);
    }
    50% {
      filter: brightness(1.3);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .orb,
    .title-block h1 {
      animation: none;
    }
  }
</style>
