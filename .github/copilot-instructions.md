# Copilot review instructions

Follow the conventions in [AGENTS.md](../AGENTS.md). In particular:

- **British English** in all user-facing copy: `-ise` not `-ize` (standardise, optimise, quantised, amortised, scrutinise, utilisation), `litres`, `colour`, `centre` in prose.
- Do **not** suggest American spellings to "fix" consistency. If copy mixes the two, prefer the British form.
- Keep original spelling in proper nouns and cited source titles, and in code identifiers / CSS properties.
- Editorial stance: CO₂ reporting is framed as accountability for providers and buyers, not guilt on the individual user.

For demo changes, validate with `cd apps/demo && ./node_modules/.bin/vite build` (not `tsc`).
