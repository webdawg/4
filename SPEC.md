# Project Spec — Global Food Delivery Network (3D Web Simulation)

Status as of 2026-08-12. Written so a new session can pick this up cold.

> **Update (same day, later session)**: the blockers below are resolved.
> npm is installed, the repo is initialized, scaffolded, committed, and
> pushed to **https://github.com/webdawg/food-relief-network** (public).
> Git identity on this machine: `HACK SPHERE LABS <webdawg@gmail.com>`
> (repo-local config, user-confirmed). Dev server verified working
> (`npm run build` and `npm run dev` both succeed; textures load). The
> "Not yet done / next steps" list further down is now mostly done —
> see the bottom of this file for what's actually still open.

## Mission

Build a **3D, web-browser-viewable simulation of a global automated food
delivery network** aimed at ending starvation "at any cost" — i.e. the
simulation should model/visualize multiple delivery modalities, not just
conventional logistics:

- Space (orbital drop / satellite-based delivery)
- Ship (sea freight)
- Plane (air freight/airdrop)
- Catapult (extreme/edge-case short-range delivery — deliberately included,
  not a joke to be filtered out)
- "Instructions" (non-physical delivery — e.g. broadcasting
  farming/food-production knowledge to a region instead of shipping goods)
- "Anything" — the system should be open-ended enough to add new delivery
  modes later

This is explicitly meant to be broad and unconstrained in concept. The
near-term deliverable is a **visualization/simulation**, not real-world
logistics infrastructure.

## Decisions already made (via AskUserQuestion, confirmed by user)

1. **GitHub repo name**: `food-relief-network`
2. **Visibility**: Public
3. **First artifact**: originally "planning docs first" was chosen, but the
   user then clarified mid-session that they actually want a working **3D
   web simulation**, not docs-first. Treat the docs-first answer as
   superseded — code/visualization is the real first artifact.
4. **3D visualization stack**: **Three.js + three-globe**
   (recommended option, chosen over React Three Fiber+drei and CesiumJS).
   Rationale given to user: three-globe is a lightweight library built on
   Three.js with arcs/points/rings support out of the box — good fit for
   animated routes between lat/lng nodes (ships, planes, satellites), fast
   to scaffold with plain Vite + TypeScript, no backend or Ion token needed
   (unlike Cesium).
5. **Package manager for install**: user chose `sudo pacman -S npm`
   (plain npm), not pnpm.

## Environment findings (this machine)

- OS: Manjaro Linux (Arch-based), kernel 6.6.144-3-MANJARO
- Working directory: `/home/neoweb/DATA/CODE/4` — was **empty**, **not a git
  repo** at session start
- `git` 2.55.0 — installed
- `gh` (GitHub CLI) 2.96.0 — installed **and authenticated** as GitHub user
  `webdawg`, scopes: gist, read:org, repo, workflow (token via keyring,
  protocol https)
- `node` v26.4.0 — installed at `/usr/bin/node` (package `nodejs
  26.4.0-1`)
- **`npm` is NOT installed** — no npm, no pnpm, no yarn, no corepack
  present anywhere on PATH. The Arch/Manjaro `nodejs` package on this
  system does not bundle npm.
- Available via pacman: `extra/npm 12.0.2-1`, `extra/pnpm 11.3.0-1`
- **Blocker hit**: tried `sudo pacman -S --noconfirm npm` — failed because
  sudo requires an interactive TTY/password prompt, which the agent cannot
  supply. User needs to run this themselves, e.g. via `! sudo pacman -S npm`
  in the Claude Code prompt (the `!` prefix runs a command directly in
  their terminal session).
- A `git init -b main` call was made and then **rejected by the user**
  (tool-use rejection) — likely just interrupted because the user wanted
  to stop and dump this spec instead, not necessarily a rejection of git
  init itself. **Re-confirm with the user before running git init again**
  in the next session — don't assume rejection = "don't do this," it may
  just = "not right now, I'm switching context."

## Not yet done / next steps for the next session

1. Confirm npm (or pnpm) is now installed (`npm --version`).
2. `git init -b main` in `/home/neoweb/DATA/CODE/4` (re-confirm with user
   given the earlier interrupted attempt).
3. Scaffold a Vite + TypeScript project (`npm create vite@latest . --
   --template vanilla-ts` or similar — confirm template choice with user,
   vanilla-ts is a reasonable default since three-globe doesn't need a UI
   framework).
4. `npm install three three-globe` (+ `@types/three` as dev dep).
5. Build an initial scene:
   - Render an interactive 3D globe in the browser (three-globe + Three.js
     renderer/camera/controls)
   - Sample data model: nodes = delivery hubs / regions in need (lat/lng +
     metadata like need-level), routes/arcs = deliveries, each tagged with
     a **mode** (`space`, `ship`, `plane`, `catapult`, `instructions`,
     extensible for more)
   - Visually distinguish modes (arc color/altitude/animation speed per
     mode) — e.g. space = high-altitude arcs, ship = ocean-hugging arcs,
     catapult = short low arcs, instructions = pulsing points/rings rather
     than arcs (non-physical delivery)
   - Keep the data model open-ended/extensible per the "anything" goal in
     the mission (don't hardcode assumptions that block adding new modes)
6. Write `README.md` (mission statement) and `docs/VISION.md` (delivery
   modalities, constraints, roadmap) — deferred but still wanted
   eventually, just not blocking the first code artifact.
7. Add `.gitignore` (node_modules, dist, etc.), commit.
8. `gh repo create food-relief-network --public --source=. --push` (or
   equivalent) to create and push the GitHub repo — **not yet done,
   nothing has been pushed anywhere.**

## Nothing has been committed or pushed yet

(Historical — see update banner at top of file. This has since happened.)

As of writing this spec, `/home/neoweb/DATA/CODE/4` contained only this
`SPEC.md` file. No git repo, no GitHub repo, no code existed yet.

## Actual current state (see update banner)

- Repo live at https://github.com/webdawg/food-relief-network, one commit
  on `main`, pushed.
- Working Vite + TS + Three.js/three-globe app in `src/`:
  - `src/data/modes.ts` — the 5 delivery modes (space, plane, ship,
    catapult, instructions) with per-mode visual style; this is the
    extension point for adding new modes.
  - `src/data/nodes.ts` — sample hub + need-region lat/lng data
    (illustrative only, not live data).
  - `src/data/routes.ts` — sample routes tagged by mode.
  - `src/main.ts` — scene: globe, camera, OrbitControls, arcs for
    physical modes, pulsing rings for the non-physical "instructions"
    mode, legend overlay.
- `README.md` and `docs/VISION.md` written (mission, modalities table,
  explicit "what this is not" section, loose roadmap).
- `npm run build` and `npm run dev` both verified working. Dev server was
  visually unverified by the agent (no browser automation tool was
  available in that session) — user should eyeball it in an actual
  browser before trusting the render is correct.

## Open items for next session

1. Visually verify the globe actually renders correctly in a real browser
   (arcs, rings, colors, legend) — not yet confirmed by a human or by
   agent screenshot.
2. Everything in `docs/VISION.md`'s "Next candidates" roadmap section is
   still just ideas, nothing started: time-based simulation, click-through
   detail panel, pluggable/real data source, capacity modeling, cost
   scoring per mode.
3. Bundle size warning from `npm run build` (~1.8MB main chunk, mostly
   three.js) — not addressed, noted but not blocking.
