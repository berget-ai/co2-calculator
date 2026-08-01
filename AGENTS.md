# AGENTS.md

Project context and conventions for AI coding agents and reviewers working in this repo.

## Language & tone

- **British English throughout** all user-facing copy and prose.
  - `-ise` not `-ize`: standardise, optimise, quantised, amortised, scrutinise, utilisation.
  - `litres`, `colour`, `centre` (when prose, not code/CSS).
  - **Exception:** proper nouns and cited source titles keep their original spelling (e.g. Uptime Institute *"Data Center Survey"*, Siddik et al. *"data centers"*).
  - **Exception:** code identifiers and CSS properties stay as-is (`color`, `center`, `waterLiters`, `fontSize`).
- Article copy is English; the team communicates in Swedish.

## Editorial stance

- CO₂ reporting is framed as a tool for **accountability**, aimed at the actors who determine emissions — **providers** who choose where to run servers, and **buyers** who procure AI without asking — not as a guilt lever on the individual user.
- The headline "stop hiding your CO₂ emissions" targets the industry, not the individual.

## Build & validate

- The true validation for demo changes is the Vite build:
  `cd apps/demo && ./node_modules/.bin/vite build`
- The repo root has pre-existing unrelated TS errors; `vite build` is the gate, not `tsc`.

## Deploy

- Production deploys via FluxCD on merge to `main` (see `.github/workflows/docker-build.yml`). `.github/workflows/pages.yml` is dead code — the site is not on GitHub Pages.
