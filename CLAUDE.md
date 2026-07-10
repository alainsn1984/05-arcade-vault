# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Important: check the vendored docs first

`node_modules/next/dist/docs/` is this Next.js version's own doc set (16.2.10 — App Router,
React 19). APIs/conventions can differ from training data. Before writing routing, data-fetching,
config, or file-convention code, check the relevant page under `01-app/` (`02-guides`,
`03-api-reference/03-file-conventions`, `03-api-reference/04-functions`, `03-api-reference/05-config`)
rather than assuming prior knowledge of Next.js.

## Project

Arcade Vault — plataforma para jugar online y competir por puntaje (see README.md).
Currently a fresh `create-next-app` scaffold (App Router, TypeScript, Tailwind v4) — no
game/scoring features implemented yet.

Uses Spec Driven Design via the `/spec` and `/spec-impl` skills from
https://github.com/Klerith/fernando-skills (installed with
`npx skills@latest add Klerith/fernando-skills`). Check for `/spec` and `/spec-impl` slash
commands / spec docs before implementing features — specs should drive implementation.

## Commands

```bash
npm run dev     # start dev server (Turbopack)
npm run build   # production build
npm run start   # run production build
npm run lint    # eslint (flat config, eslint.config.mjs)
```

No test runner is configured yet.

## Architecture

- App Router under `app/`: `app/layout.tsx` (root layout, Geist fonts) + `app/page.tsx`
  (home page). Path alias `@/*` maps to repo root (tsconfig.json).
- Styling: Tailwind CSS v4 via `@tailwindcss/postcss` (no `tailwind.config` — v4 uses
  CSS-based config in `app/globals.css`).
- `next.config.ts` is currently empty — no custom config yet.
