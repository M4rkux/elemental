# Elemental

A wood-themed sorting puzzle built with SvelteKit, TypeScript, Tailwind CSS and SCSS.

Four elements — Earth (brown), Fire (red), Water (blue) and Air (white) — hang as spheres
on ropes below wooden platforms. Sort every element onto its own rope to win.

## Rules

- Grabbing a sphere drags it and every sphere below it; the whole group must be the same element.
- A group can only be dropped below a sphere of the same element (or on an empty rope).
- Each platform holds at most 4 spheres and is complete with 4 of one element.
- Platforms are neutral or element-restricted (marked with the element's symbol and tint).
  A restricted platform's first sphere must be its own element; once occupied it stacks by
  the normal bottom-match rule, but it only counts as complete with 4 of its own element.
  An element that has a restricted platform can only be completed there, never on a
  neutral platform — restricted platforms are always mandatory. Generated phases start
  restricted platforms with their own element on top.

## Development

```sh
bun install
bun run dev        # start the dev server
bun run build      # production build
bun run check      # type checking
bun run test       # vitest: validates every phase in static/phases/
```

## Phases

Phases are JSON files served from `static/phases/` (the same shape will come from a backend
later) and loaded by `src/routes/play/[phase]`. The game rules live in
`src/lib/game/engine.svelte.ts`.

Generate a new random, guaranteed-solvable phase:

```sh
bun scripts/generate-phase.ts <id> <name> [seed] [restrictedCount]
# e.g. bun scripts/generate-phase.ts phase-11 "Twin Rivers" 2011 2
```

`restrictedCount` (default 1) is how many platforms are locked to a specific element.

Verify every shipped phase (solvable, valid sphere counts, restricted platforms well-formed):

```sh
bun scripts/verify-phases.ts
```
