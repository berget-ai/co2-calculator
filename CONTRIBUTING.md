# Contributing

Thanks for helping make AI's climate impact measurable and checkable. The whole
point of this project is that the numbers can be scrutinised — contributions that
improve the data or the method are the most valuable kind.

## What we especially need

- **Hardware PCF data** from vendors (NVIDIA, AMD, Supermicro) — see METHODOLOGY §4
- **Regional grid carbon-intensity data** for new locations, with a named source and year
- **Real-world measurements** (power draw, latency) to validate estimates
- **Integration examples** for more frameworks (see ADVANCED_USAGE.md)

## Repository layout

This is a pnpm monorepo:

- `packages/co2-calculator` — the calculator library (published to npm as `@berget/co2-calculator`)
- `apps/demo` — the live site at co2.berget.ai (Vite + React)
- `METHODOLOGY.md` — the method document the numbers are derived from

## Getting started

```bash
pnpm install

# Run the library tests
cd packages/co2-calculator && pnpm test

# Build the library
cd packages/co2-calculator && pnpm build

# Run the demo site locally
cd apps/demo && pnpm dev
```

## Ground rules

- **Numbers must be sourced.** If you change a value in `src/models.ts`,
  `src/hardware.ts` or `src/grids.ts`, cite where it comes from (a datasheet, an
  LCA report, a measurement). Editorial estimates are labelled as such.
- **Keep doc and code in lock-step.** Several METHODOLOGY.md tables are generated
  from the code — see `packages/co2-calculator/scripts/generate-methodology-example.mjs`.
  If you change the calculator, regenerate them.
- **Validate the demo build.** The true gate for site changes is:
  `cd apps/demo && ./node_modules/.bin/vite build`
- **British English** in user-facing copy (see AGENTS.md).

## Pull requests

- Open a PR against `main`; the branch-protection ruleset requires it.
- Keep PRs focused — one logical change per PR.
- Describe any figure you change and why, with a source.

## Code of conduct

Be straightforward and constructive. We are trying to get the numbers right, not to win arguments.
