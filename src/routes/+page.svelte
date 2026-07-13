<script lang="ts">
  import Sphere from "$lib/components/Sphere.svelte";
  import { PHASES } from "$lib/game/phases";
  import { progress } from "$lib/game/progress.svelte";
  import { ELEMENTS } from "$lib/game/types";
</script>

<svelte:head>
  <title>Elemental</title>
</svelte:head>

<main class="menu">
  <div class="menu-panel plank">
    <h1>Elemental</h1>
    <p class="tagline">Sort the elements of Earth, Fire, Water and Air</p>

    <div class="spheres">
      {#each ELEMENTS as element (element)}
        <Sphere {element} />
      {/each}
    </div>

    <a class="play plank" href="/play/{progress.current.id}">Play</a>

    <nav class="levels" aria-label="Level select">
      {#each PHASES as phase, i (phase.id)}
        {#if progress.isUnlocked(phase.id)}
          <a
            class="level plank"
            class:level--completed={progress.isCompleted(phase.id)}
            href="/play/{phase.id}"
            title={phase.name}>{i + 1}</a
          >
        {:else}
          <span class="level plank level--locked" title="Locked">{i + 1}</span>
        {/if}
      {/each}
    </nav>
  </div>
</main>

<style lang="scss">
  .menu {
    min-height: 100vh;
    display: grid;
    place-items: center;
    padding: 1rem;
  }

  .menu-panel {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.25rem;
    padding: 2.5rem 3rem;
    text-align: center;

    h1 {
      font-size: 2.8rem;
      font-weight: 800;
      letter-spacing: 0.05em;
      text-shadow: 0 2px 0 rgba(255, 240, 210, 0.5);
    }
  }

  .tagline {
    max-width: 16rem;
    color: var(--wood-dark);
  }

  .spheres {
    display: flex;
    gap: 0.75rem;
    --sphere-size: 2.5rem;
  }

  .levels {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 0.5rem;
  }

  .level {
    display: grid;
    place-items: center;
    width: 2.6rem;
    height: 2.6rem;
    font-weight: 700;
    color: var(--wood-darkest);
    text-decoration: none;

    &:hover {
      filter: brightness(1.08);
    }

    &:active {
      transform: translateY(1px);
    }

    &--completed {
      box-shadow:
        inset 0 0 0 2px rgba(46, 107, 31, 0.55),
        0 4px 10px rgba(40, 20, 5, 0.45);
    }

    &--locked {
      opacity: 0.45;
      filter: saturate(0.6);
      cursor: not-allowed;

      &:hover {
        filter: saturate(0.6);
      }

      &:active {
        transform: none;
      }
    }
  }

  .play {
    padding: 0.75rem 3rem;
    font-size: 1.3rem;
    font-weight: 700;
    color: var(--wood-darkest);
    text-decoration: none;

    &:hover {
      filter: brightness(1.08);
    }

    &:active {
      transform: translateY(2px);
    }
  }
</style>
