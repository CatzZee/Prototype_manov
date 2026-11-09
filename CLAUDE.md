# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Priora is a static hi-fi prototype ("gelombang 1", wave 1) of a mobile task-reminder app for university students. Tasks are scored into four priority quadrants by a "Priority Engine" defined in the team's SDD (section 3.3.1). The prototype uses only plain HTML, CSS and vanilla JS. It has no framework, no `package.json`, no dependencies and no server. Fonts (Plus Jakarta Sans) and icons (Material Symbols Rounded SVGs) are bundled locally, so everything works offline.

All UI copy, comments and docs are in **Indonesian**. Keep new copy in Indonesian and match the existing terms (e.g. "Kerjakan Sekarang", "Terlewat", "Urungkan", "Tunda").

## Commands

- **Rebuild everything:** `node tools/build.mjs`. This regenerates `js/icons.js`, every `screens/*.html` and `index.html`.
- **View:** open `index.html` in a browser. It is a gallery of all screens in 360×800 phone frames. Each screen can also be opened directly from `screens/`. S04 has state variants via query string: `?state=kosong|memuat|offline|error`.
- **Engine check:** `node tools/check-engine.mjs`. It asserts the engine's output for the sample tasks against the SDD worked example (`laporan` Q1 91.45, `uas` Q2 53.25, `berkas` Q3 52.42, `catatan` Q4 17.62). `tools/build.mjs` imports it, so the build throws on a mismatch. If you change `engine.js` or those tasks in `data.js`, it must still pass.
- **Serve locally (needed for `?id=` query pages in tools):** `python -m http.server 8765` from the repo root, then open `http://localhost:8765/screens/s04-hari-ini.html`. Plain `file://` also works for browsing.
- **Other tests:** there is no automated test suite yet (a Playwright suite is planned in `PLAN.md`).

## Architecture

**Generated files: don't hand-edit them.** `screens/*.html`, `index.html` and `js/icons.js` are all written by `tools/build.mjs`. To change markup or text, edit the generator (or the shared modules), then rebuild. Hand edits to generated files are lost on the next build.

The JS modules are UMD-style IIFEs. Each one attaches to `window` (`PrioraEngine`, `PrioraIcons`, `PrioraRender`, data) and also sets `module.exports`. This lets the **same code run in two places**:
1. In Node at build time. `build.mjs` `require()`s them to produce the static HTML.
2. In the browser at runtime. Every screen loads them in this order: `icons.js` → `data.js` → `store.js` → `engine.js` → `render.js` → `views.js` → `app.js`.

Module roles:
- `js/data.js` is the **single source of sample data**: user, settings, categories with weight `W` and default estimate, courses (color tone), tasks, events, work blocks, the sudden-event scenario and the reschedule plan. The prototype clock is frozen at `now: '2026-10-19T09:40'` (Monday) so every screen agrees. All derived numbers come from this file plus the engine; never hard-code them in markup.
- `js/engine.js` holds the pure Priority Engine and the Indonesian time/number formatting (`dur`, `clock`, `deadlineText`, …). `score()` implements SDD 3.3.1. Available time `A = T·H/24`, remaining effort `R = max(E·(1−p), 0.25)`, slack `S = A/R`. Urgency `U` comes from `S` (capped at 0.2 beyond 336 h). Importance `Imp = 0.6·(I−1)/4 + 0.4·W`. Score = `100·(0.55·U + 0.45·Imp)`. The quadrant comes from the `U ≥ 0.5` and `Imp ≥ 0.5` thresholds. `enrich()` adds these fields to every task and applies a manual `override` quadrant.
- `js/store.js` (`PrioraStore`) keeps everything the user changes on top of `data.js`: new tasks, done/snooze/start, progress, manual priority lock, rescheduled blocks, fail-safe setting. Persistence order: `localStorage['priora:v1']` → `window.name` (while the tab lives) → memory (S04 then shows an honest notice). `Store.data()` returns an object shaped exactly like `PrioraData`, so `engine.enrich` and every view work on it unchanged; `Store.data({simulate:{…}})` previews a reschedule without saving. Actions emit `{type, detail}` to `Store.on` listeners (the test-mode logger in Phase 5 will use this). `Store.say(text, undoSpec)` queues a one-shot message shown by the next screen (replaces the old `?msg=` params); `undoSpec` is whitelisted in `Store.run`. A stored state with another `seedVersion` or broken JSON is silently replaced by fresh sample data. Task ids are slugs (`[a-z0-9-]`), because `data-detail`/`data-task` are not escaped; titles and courses are always escaped by `esc()`.
- `js/render.js` holds the shared HTML fragment builders (`icon`, `badge`, `slack` bar, `esc`, `srLabel`, `quadWhy`, …). Both the build and `app.js` use them.
- `js/views.js` (`PrioraViews`) holds the screen-level HTML builders shared by build and browser: `heroCard`, `rowCard`, `overdueCard`, `strip`, `agenda`, `week`, `summary`, `detail`, nav and brand pieces. `model(D)` derives everything a screen needs; `hariIniMain`, `daftarMain`, `kalenderMain` and `diterapkanMain` build the full inner HTML of S04, S07, S10 and S11c, plus cards, week/month views and the S06 detail. The build calls them with sample data; `app.js` calls them again with `Store.data()`. S05a, S08, S11a/b and S14 are still built inline in `build.mjs`.
- `tools/build.mjs` is the page generator. `page({file, title, body, bodyClass, dock, theme, desc})` writes one screen. One section per screen is marked `// ---------- Sxx ... ----------`. **S06 Detail is a single page**, `s06-detail.html?id=<taskId>`: the build writes an empty `#screen-root[data-boot="s06"]` and `app.js` renders it from the URL with `PrioraViews.detail()` (unknown id shows a calm "not found" panel). The old `s06-detail-<id>.html` names are only redirect stubs. Sheet screens (S05a, S11a) render a non-interactive copy of S04 behind a scrim (`behindS04()`). The `FLOWS` array at the end drives the `index.html` gallery.
- `js/app.js` handles runtime interaction. It initialises the store, re-renders S04/S07/S10/S11c from `Store.data()` (`mount()` / `refresh()`, which is also called after every state-changing action), then reads `data-screen` and branches per screen. `[data-act]` buttons on cards write to the store; links with `data-do="start|done|snooze|resched|undoplan"` (S08a, S08d, S11c) run a store action and then follow their `href`. Shared behaviors: snackbars with Urungkan, swipe on `[data-swipe]` cards, `role="radio"` groups and sheets. No state travels in query params any more (`?view=`/`?id=`/`?state=` only select what to show). Generated HTML is just the initial sample-data state and the no-JS fallback.
- `css/tokens.css` holds all design tokens as CSS variables (light mode only; dark mode would go here). `css/components.css` holds the components.

**Icons:** to add an icon, drop a Material Symbols Rounded SVG into `tools/icons/` and rebuild. The build strips the `<svg>` wrapper and inlines the paths into `js/icons.js`. Then use `icon('name')`.

## Design constraints (see `PLAN.md`; older notes in `.taste-skill/notes.md`)

The project is mid-migration from the old "achromatic-ledger" style to **pastel-consumer** (see `PLAN.md` for phases and status; Phases 1–3 are done, so every screen has the new look; state persistence, test mode and PWA are still to come).

- Style "pastel-consumer": ground `#f2f4f7`, task cards are pastel quadrant tiles (SDD 6.2.2 pairs: Q1 `#FFEBEE`/`#B71C1C`, Q2 `#FFF8E1`/`#6D4C00`, Q3 `#E3F2FD`/`#0D47A1`, Q4 `#E8F5E9`/`#1B5E20`) with the dark ink of the same hue. The top Q1 card on S04 is the **only dark card**. Only Q1/Overdue cards keep the thick left edge. Red is reserved for Q1/Overdue (a shortfall in other quadrants uses that quadrant's ink). No gradients, glass, glow, emoji, dark mode; shadows only on floating elements.
- The signature element is the slack bar ("bilah cukup waktu"). Its track is the productive time available before the deadline, its fill is the remaining effort, and any overrun is marked. It visualizes `A` vs `R`.
- Inputs and chips are "filled" (`--field`, one underline in `--field-line`); S10 has Hari/Minggu/Bulan via `?view=day|week|month&d=<tanggal>` and shows only real deadlines, events and blocks (no invented recurrence).
- Mobile-first. Layouts are checked at 320/360/390/430 with no horizontal overflow. One 16 px margin, card radius 22, pill buttons, touch targets ≥ 48 px (`--tap`; the 7-day week strip is the one documented exception at 320 px), a fixed bottom dock (action bar + 4-tab nav). Body padding equals the `--dock` height. WCAG AA contrast is required; check new colour pairs before using them.
- `inspect.mjs --app` reports `covered-text` (the fixed dock covers text on its 360×225 viewport) and `palette-cream` (`#FFF8E1` is the SDD's Q2 colour). Both are intentional; pass `--allow covered-text,palette-cream` and say why.
- Numbers must stay consistent across screens. For example, the Laporan task shows 5 j 05 m available vs 6 j needed (55 m short) on S04, S06 and S08a. Derive them from the engine, never type them in by hand.
- All content is sample data the team must still confirm. The default estimates per category are flagged `[ASUMSI]` (not yet in the SDD).
