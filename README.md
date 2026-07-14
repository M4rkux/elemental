# Elemental

A wood-themed sorting puzzle built with SvelteKit, TypeScript, Tailwind CSS and SCSS.

Four elements — Earth (brown), Fire (red), Water (blue) and Air (white) — hang
on ropes below wooden platforms. Sort every element onto its own rope to win.

## Rules

- Grabbing an element drags it and every element below it; the whole group must be the same element.
- A group can only be dropped below an element of the same kind (or on an empty rope).
- Each platform holds at most 4 elements and is complete with 4 of one kind.
- Mystery elements (dark purple, question mark) are hidden: they can't be picked up — not
  even grouped with a matching element below — and get revealed when the element below
  them is removed, i.e. when they become the bottom of their rope.
- Platforms are neutral or element-restricted (marked with the element's symbol and tint).
  A restricted platform's first element must be its own element; once occupied it stacks by
  the normal bottom-match rule, but it only counts as complete with 4 of its own element.
  An element that has a restricted platform can only be completed there, never on a
  neutral platform — restricted platforms are always mandatory. Generated levels start
  restricted platforms with their own element on top.

## Development

The app reads levels from Postgres, so start the database first:

```sh
docker compose up -d   # Postgres on localhost:5433 (see .env.example)
bun install
bun run db:migrate     # apply migrations from drizzle/
bun run db:seed        # upsert levels from db/seeds/levels/
bun run dev            # start the dev server
```

Other commands:

```sh
bun run build          # production build
bun run check          # type checking
bun run test           # vitest: validates every level seed in db/seeds/levels/
bun run db:generate    # generate a new migration after editing the schema
bun run db:studio      # browse the database with drizzle studio
```

## Database

- Schema: `src/lib/server/db/schema.ts` (Drizzle ORM, Postgres).
- Migrations: `drizzle/`, generated with `drizzle-kit generate` and applied with `db:migrate`.
- `levels` table: `number` is the unique campaign position (1..∞), `stage` groups levels
  (stage 1 holds levels 1–10, and so on), `data` is the playable board as jsonb
  (`{ maxPerPlatform, platforms }`).
- Locally the database runs via `docker-compose.yml`; in production point `DATABASE_URL`
  at a hosted Postgres (e.g. Neon on Vercel).

## Levels

Level seeds are JSON files in `db/seeds/levels/`, upserted by `bun run db:seed` and
served to the game by the server routes. The game rules live in
`src/lib/game/engine.svelte.ts`, mirrored by `scripts/solver.ts`.

Generate a new random, guaranteed-solvable level seed:

```sh
bun scripts/generate-level.ts <number> <name> [seed] [restrictedCount] [stage] [mysteryCount]
# e.g. bun scripts/generate-level.ts 11 "Veiled Balance" 1011 1 2 1
```

`restrictedCount` (default 1) is how many platforms are locked to a specific element;
`stage` defaults to `ceil(number / 10)`; `mysteryCount` (default 0) is how many elements
start hidden.

Verify every level seed (solvable, valid element counts, restricted platforms and hidden
elements well-formed):

```sh
bun scripts/verify-levels.ts
```

The same checks run as unit tests: `bun run test` (`scripts/levels.test.ts`).
