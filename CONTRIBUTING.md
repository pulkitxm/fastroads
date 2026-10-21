# Contributing

Issues and pull requests are welcome. Keep a pull request focused, and describe it in one line.

## Setup

```bash
bun install
bun run dev
```

## Checks

```bash
bun run ci
```

`bun run ci` has to pass before a change is ready. It covers formatting, lint, the no-comment check, types, tests, and the production build.

## Style

The source has no comments. Names and structure carry the meaning. Functional directives such as `biome-ignore` and `@ts-expect-error` are the exception.

Do not add compatibility shims for old saves or old controls. Match the behavior the game has now.

Prefer the simulation modules under `src/game` when a change can be tested without a browser.

Squash merge is how changes land on `main`.
