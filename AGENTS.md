# Agent notes

Use Bun. `bun run ci` is the check that has to pass.

Do not add comments to source files. `bun run comments` enforces that. `biome-ignore`, `@ts-expect-error`, and `eslint-` directives are allowed.

Keep the driving simulation in `src/game` so it can be tested without WebGL. The renderer lives in `src/render`.

Commit as the repository owner. Do not attach an agent identity to commits.
