<script lang="ts">
  import ElementPiece from "$lib/components/ElementPiece.svelte";
  import { progress } from "$lib/game/progress.svelte";
  import { ELEMENTS } from "$lib/game/types";

  let { data } = $props();

  let playTarget = $derived(progress.firstUnfinished(data.levelNumbers));
</script>

<svelte:head>
  <title>Elemental</title>
</svelte:head>

<main class="menu">
  <div class="menu-panel plank">
    <h1>Elemental</h1>
    <p class="tagline">Sort the elements of Earth, Fire, Water and Air</p>

    <div class="elements">
      {#each ELEMENTS as element (element)}
        <ElementPiece {element} />
      {/each}
    </div>

    <a class="play plank" href="/play/{playTarget}">
      <span class="play-label">Play</span>
      <span class="play-level">Level {playTarget}</span>
    </a>
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

  .elements {
    display: flex;
    gap: 0.75rem;
    --element-size: 2.5rem;
  }

  .play {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.15rem;
    padding: 0.75rem 3rem;
    color: var(--wood-darkest);
    text-decoration: none;

    &:hover {
      filter: brightness(1.08);
    }

    &:active {
      transform: translateY(2px);
    }
  }

  .play-label {
    font-size: 1.3rem;
    font-weight: 700;
  }

  .play-level {
    font-size: 0.85rem;
    font-weight: 600;
    opacity: 0.75;
  }
</style>
