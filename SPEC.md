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
>
> **Update (same day, further session)**: user confirmed the moving
> delivery objects render correctly ("it is perfect"). Dev server is now
> pinned to **port 60004** via `vite.config.ts` (`npm run dev` always
> serves there). User then asked to turn the sample distribution routes
> (arcs, moving objects, knowledge-broadcast rings) **off without
> deleting them**, since they look cool and may come back. See
> "Distribution routes toggle" section near the bottom for how this
> works and how to re-enable.
>
> **Update (same day, further session)**: user re-confirmed routes should
> stay off ("toggle all routes off and lets start to build the network")
> — `SHOW_DISTRIBUTION_ROUTES` was already `false`, verified still is.
> Asked what "build the network" means next; user chose **"real
> hub/need-region dataset"** (not an editor UI, not simulation logic —
> just replace/expand the illustrative sample data with a bigger,
> realistic, still-hand-authored dataset). Implemented: `src/data/nodes.ts`
> now has real sea port / air cargo hub / orbital launch site / UNHRD
> humanitarian depot locations (24 hubs) plus 13 widely-reported
> food-insecure regions. Hub points are now color-coded by `hubType` (port
> / air / space / depot) since routes are off and points are the whole
> visual story right now. See "Real hub/need-region dataset" section near
> the bottom for the full rationale and what's still a placeholder.
>
> **Update (same day, further session)**: user issued a full strategic
> design brief for the actual global food system this project simulates —
> production layers, technology tradeoffs, water/energy economics,
> distribution, waste, economic access, open standards, AI monitoring,
> phased rollout, success metrics. This was written up as
> **`docs/GLOBAL_FOOD_SYSTEM.md`**, not implemented as code — it's the
> strategic design layer that the simulation currently only partially
> represents (see that doc's closing "Relationship to the simulation"
> section for exactly what's already aligned — e.g. `hubType: "depot"`
> already mirrors the real WFP UNHRD network described there — and what
> the data model doesn't capture yet, e.g. zone archetypes, production
> layers, the module spec table). Read that doc before doing further
> design work on this project; it's the reference framework everything
> else should be checked against.
>
> **Update (same day, further session)**: user asked me to disregard and
> restart — clarified via AskUserQuestion this meant "rewrite
> GLOBAL_FOOD_SYSTEM.md without hedging/caveats, commit to concrete
> numbers" (not wipe the repo). Before that rewrite happened, user
> redirected mid-turn to focus specifically on the "space" delivery mode:
> automated orbital units that grow food and drop it. Wrote
> **`docs/SPACE_DELIVERY.md`** — decisive, concrete design for the
> orbital growing/delivery subsystem (why orbit at all, growing tech
> choice, orbital architecture, per-unit subsystems, the deorbit capsule,
> what must be resupplied from Earth and why, autonomy/failure handling,
> a per-unit spec table), applying the "no hedging, commit to numbers"
> style from the clarification. **The broader hedging-removal rewrite of
> `GLOBAL_FOOD_SYSTEM.md` itself has NOT been done yet** — that request
> is still open, just deprioritized by the space-focus redirect. Do that
> next if the user returns to it.
>
> **Update (same day, further session)**: user said "build this all into
> the running simulation and activate it." Implemented in `src/main.ts`:
> **`SHOW_DISTRIBUTION_ROUTES` flipped to `true`** (routes are on by
> default now — see updated "Distribution routes toggle" section), and
> the "space" delivery mode was rebuilt to actually represent
> `docs/SPACE_DELIVERY.md` instead of reusing the generic hub→need arc:
> an 8-satellite orbital constellation (simplified circular orbits —
> inclination/RAAN/phase, not real ephemerides) continuously circles the
> globe at the same altitude as `MODE_STYLES.space.altitude`; faint
> "resupply beam" lines run from each space hub straight up to orbit;
> and small cone-shaped capsules periodically launch from whichever
> satellite is currently nearest a `space`-route's target `need` node and
> fly a deorbit curve down to it, repeating on a set cadence. Ship/plane/
> catapult/instructions modes are unchanged (generic arcs/moving-objects/
> rings, now visible again since the toggle is on). See "Orbital
> constellation + deorbit capsules" section near the bottom for
> implementation detail. Build/typecheck pass; **not yet visually
> confirmed by the user** in this session — no browser tool available to
> the agent, same limitation as every prior session.
>
> **Update (same day, further session)**: user said "make everything
> selectable so we can understand all the information about it." Added a
> click-to-inspect system in `src/main.ts` covering every rendered thing:
> hub/need points, arcs, instructions rings, ship/plane/catapult moving
> objects, orbital satellites, deorbit capsules, and resupply beams —
> clicking any of them opens an info panel (top-right) with structured
> detail; clicking empty space or the panel's close button dismisses it.
> Hovering a selectable object changes the cursor to a pointer. See
> "Selection / info panel" section near the bottom for implementation
> detail — notably, this reuses three-globe's internal `__data`/
> `__globeObjType` tagging on generated meshes rather than rebuilding
> point/arc/ring rendering from scratch just to make them clickable.
> Build/typecheck pass; **not yet visually confirmed by the user**.

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
- `npm run build` and `npm run dev` both verified working. **User has
  visually confirmed the render in a real browser** ("it is perfect") —
  this includes the globe, zoom range, and moving delivery objects.
- Moving delivery objects added: one mesh per physical route (icosahedron
  = space, octahedron = plane, box = ship, tetrahedron = catapult),
  traveling repeatedly along a `QuadraticBezierCurve3` built from each
  route's start/end/altitude, at a speed derived from
  `MODE_STYLES[mode].dashDuration` (catapult fastest, ship slowest). See
  `buildArcCurve` / `makeModeMesh` / `movingObjects` in `src/main.ts`.
- Zoom range tightened: `controls.minDistance` 150 → 104 (globe radius is
  100, from `globe.getGlobeRadius()`), so the camera can get close to the
  surface.
- Dev server pinned to **port 60004** via `vite.config.ts`
  (`server.port` / `preview.port`, both `strictPort: true`). `npm run dev`
  and `npm run preview` always use this port now — don't let it drift.

## Distribution routes toggle

The distribution routes (arcs, moving delivery-object meshes,
knowledge-broadcast pulsing rings, and the orbital constellation/deorbit
capsules) are **currently turned ON** (`SHOW_DISTRIBUTION_ROUTES = true`
in `src/main.ts`). This was off for a stretch of earlier sessions and is
now on again per the user's "build this all into the running simulation
and activate it" — see the update banner at the top.

- Single switch: `SHOW_DISTRIBUTION_ROUTES` constant near the top of
  `src/main.ts`.
- When `false`: `physicalRoutes` and `instructionRoutes` resolve to `[]`,
  cascading to empty `arcsData`/`ringsData`, an empty `movingObjects`
  array, an empty `satellites` array, no resupply beams, and no
  `capsuleSpawners` — nothing route- or orbit-related gets created or
  added to the scene. The globe still renders with all the hub/need-region
  points. The legend also drops its per-mode rows when the flag is off.
- **To turn routes back off**: flip `SHOW_DISTRIBUTION_ROUTES` to `false`
  in `src/main.ts` — no other changes needed, everything downstream reacts
  to the flag automatically, same as before.
- This is a deliberate, reversible product toggle either direction, not a
  bug or cleanup concern.

## Real hub/need-region dataset

`src/data/nodes.ts` was expanded from 7 hubs / 7 need-regions (illustrative
placeholder names) to a real, hand-authored dataset:

- **24 hubs**, each tagged with a `hubType` (`"port" | "air" | "space" |
  "depot"`), coordinates are real public locations:
  - 7 sea ports (Rotterdam, Singapore, Shanghai, LA/Long Beach, Santos,
    Mumbai/JNPT, Durban)
  - 6 air cargo hubs (Miami, Dubai, Memphis, Hong Kong, Frankfurt, Addis
    Ababa)
  - 5 orbital launch sites (Kourou, Baikonur, Kennedy Space Center,
    Jiuquan, Sriharikota)
  - 6 humanitarian logistics depots, matching WFP's real UNHRD network
    (Nairobi, Brindisi, Accra, Panama City, Subang, Las Palmas)
- **13 need-regions**: widely-reported food-insecurity contexts (Sahel,
  Horn of Africa, Yemen, South Sudan, Sudan/Darfur, Gaza, Haiti,
  Afghanistan, Eastern DRC, Northwest Syria, Rakhine/Myanmar, Southern
  Madagascar, Remote Pacific). `needLevel` (0-1) is a rough illustrative
  approximation, **not** a precise or sourced severity ranking — no live
  IPC/FEWS NET/WFP feed is wired in. Some of these are active
  conflict-affected regions (Gaza, Sudan, Syria, Myanmar) — names/framing
  were kept neutral and factual (matching how these are broadly,
  non-politically referred to in public UN/humanitarian reporting), no
  political commentary was added.
- Original 7 hub / 7 need-region IDs were **kept unchanged** (same
  `id`/`lat`/`lng`) so `src/data/routes.ts` (currently unused while routes
  are toggled off) still resolves correctly if/when routes come back. New
  nodes aren't yet wired into any routes.
- Hub points are now color-coded by `hubType`
  (`HUB_TYPE_COLORS`/`HUB_TYPE_LABELS` in `src/main.ts`: port=cyan,
  air=amber, space=violet, depot=teal) with a matching legend section that
  always shows (unlike the route-mode legend rows, which only show when
  `SHOW_DISTRIBUTION_ROUTES` is `true`). This was added specifically
  because with routes off, the hub network's points are the entire visual
  — differentiating them by type gives the globe meaning on its own.
- `buildLegend()`'s call site was moved from the top of `src/main.ts`
  (right after the canvas is created) to the bottom, after `HUB_TYPE_COLORS`
  is declared — it references that const, and calling it at the old
  location would hit the temporal-dead-zone before the const existed.

## Open items for next session

1. Everything in `docs/VISION.md`'s "Next candidates" roadmap section is
   still just ideas, nothing started: time-based simulation, click-through
   detail panel, pluggable/real data source, capacity modeling, cost
   scoring per mode.
2. Bundle size warning from `npm run build` (~1.8MB main chunk, mostly
   three.js) — not addressed, noted but not blocking.
3. New hubs/need-regions aren't wired into any routes yet (routes are off
   anyway) — if routes come back on, `src/data/routes.ts` will need new
   entries to make use of the expanded node set, otherwise most of the new
   nodes will just sit there unconnected.
4. `needLevel` values across all 13 need-regions are the author's rough
   illustrative estimates, not derived from any dataset — flag this
   clearly if the project ever moves toward presenting this as real/live.

## Orbital constellation + deorbit capsules

Implements `docs/SPACE_DELIVERY.md` inside `src/main.ts`, replacing the
generic arc treatment for the "space" mode specifically (ship/plane/
catapult/instructions are untouched and still use the original generic
arc/moving-object/ring code).

- `physicalRoutes` is split into `surfaceRoutes` (mode !== "space", feeds
  the existing generic `arcsData`/`movingObjects` pipeline unchanged) and
  `spaceRoutes` (mode === "space", feeds the orbital system below). This
  split happens right after `physicalRoutes` is computed.
- **`Satellite` / `satellites`**: 8 satellites (`SATELLITE_COUNT`), each a
  small `THREE.Group` (box body + two panel meshes) added directly to
  `globe`. Position each frame comes from `satellitePosition(sat,
  elapsedMs)` — a simplified circular-orbit parametrization using
  inclination, RAAN, and phase (NOT a real orbital ephemeris, explicitly
  noted in the code comment). Orbit radius is
  `GLOBE_RADIUS * (1 + MODE_STYLES.space.altitude)`, i.e. the same
  altitude the old space arcs peaked at, so it's visually consistent with
  the rest of the "space" mode's color/altitude language.
- **Resupply beams**: one faint purple `THREE.Line` per space-hub node
  (`hubType === "space"`), straight up from the hub's surface coordinate
  to orbital altitude. Static, not animated — represents the
  nutrient/water/propellant resupply flights from `docs/SPACE_DELIVERY.md`,
  doesn't need to move to communicate that.
- **`CapsuleSpawner` / `capsuleSpawners`**: one per `spaceRoutes` entry
  (currently 2: `r-space-afghanistan`, `r-space-pacific` from
  `src/data/routes.ts` — unchanged data, only the rendering changed).
  Each spawner has a `cadenceMs` (9000ms) and fires repeatedly.
- **`spawnCapsule`**: on each fire, finds whichever satellite is currently
  nearest the target (`nearestSatellitePosition`, brute-force distance
  check over 8 satellites — trivial cost) and builds a
  `QuadraticBezierCurve3` from that satellite's *current* position to the
  target's surface coordinate. This is why capsules can't reuse the
  static `movingObjects` pattern (which precomputes one fixed curve at
  startup) — the launch point moves every time, so the curve has to be
  built fresh per launch, in `spawnCapsule`, not once at module load.
- **`activeCapsules`**: a mutable array (unlike `movingObjects`, which is
  static once built) because capsules are transient — created on launch,
  advanced each frame via `capsule.curve.getPoint(t)`, and removed
  (`globe.remove(capsule.mesh)` + `.splice()`) once `t >= 1`, i.e. once
  delivered. This is the one place in `src/main.ts` doing per-frame
  scene-graph mutation rather than just repositioning a fixed set of
  meshes.
- Not yet done: no visual "impact" effect when a capsule lands (could
  reuse the existing `ringsData` ring-pulse mechanism at the landing
  point); no distinction drawn between "capsule in flight" and "capsule
  delivered" beyond removal; satellite orbital parameters are tuned for
  a reasonable-looking spread and speed, not derived from anything.
- **Still not visually confirmed by the user** as of this write-up — same
  caveat as everything else added without a browser tool available to the
  agent. Check the constellation is actually visible/reasonable-looking at
  the default camera distance (350, per `camera.position.set` near the top
  of `src/main.ts`) before trusting this description further.

## Selection / info panel

Click-to-inspect for every rendered entity, implemented in `src/main.ts`
after the legend section.

- **Why this works without rebuilding point/arc/ring rendering**:
  three-globe internally tags every generated mesh with `__globeObjType`
  (`"point" | "arc" | "ring" | ...`) and `__data` (a reference back to the
  exact datum passed into `.pointsData()`/`.arcsData()`/`.ringsData()`).
  This isn't in the public `.d.ts` API surface (confirmed by grepping the
  type defs — nothing there), but it's real, stable behavior in the
  compiled `three-globe.mjs` (`ThreeDigest` class, `dataBindAttr: '__data'`
  default) used consistently across every layer type. `pointsMerge`
  defaults to `false`, which is required for this — merged points would
  collapse to one mesh with no per-point identity.
- **`resolveSelectable(object)`**: walks up the clicked object's parent
  chain (raycast hits a leaf mesh — e.g. a satellite's body box, not the
  satellite `Group` — so parent-walking is required) until it finds either
  `.userData.selectableType` (for meshes this project created directly:
  satellites, moving objects, capsules, resupply beams) or
  `__globeObjType` + `__data` (for three-globe-generated meshes: points,
  arcs, rings). Stops at `globe` itself so it never walks into `scene`.
- **Data enrichment**: `arcsData` and `ringsData` were extended with
  `mode`/`fromName`/`toName` (arcs) and `mode`/`nodeName` (rings) — the
  original data objects didn't carry enough to build a readable panel, so
  the enrichment happens once at data-build time rather than doing lookups
  at click time.
- **`SelectableHit`**: a discriminated union (`type` + typed `data`) over
  all seven selectable kinds (`node`, `arc`, `ring`, `moving`, `satellite`,
  `capsule`, `beam`) so `describeSelection`'s switch is exhaustively typed.
- **Live values at click time**: satellite and capsule info panels compute
  values (position, reentry progress) at the moment of the click using
  `latestElapsedMs` — a module-level variable updated at the top of the
  render loop every frame — rather than freezing stale values from when
  the object was created.
- **Click vs. drag disambiguation**: `pointerdown`/`pointerup` on `canvas`
  track the pixel distance moved; anything over 5px is treated as an
  OrbitControls rotate/pan gesture and ignored, not a click. Without this,
  every drag-to-rotate would also fire a selection (or clear one).
- **Hover feedback**: `pointermove` raycasts on every move and sets
  `canvas.style.cursor` to `"pointer"` when hovering something selectable,
  `""` (default) otherwise. Cheap at this scene's object count; would need
  throttling if the object count grows substantially.
- **`raycaster.params.Line.threshold`** is widened to `GLOBE_RADIUS * 0.01`
  (1 unit) — the default threshold is far too small to reliably hit a
  zero-width `THREE.Line` (used for resupply beams) at this scene's scale.
- Clicking empty space (ocean, or nothing) hides the panel — `pickAt`
  returns `null` when no selectable object is found along the ray, and the
  click handler calls `infoPanel.hide()` in that case.
- Not yet done: no visual highlight on the selected object itself (only
  the panel appears) — a future pass could add an outline/scale-pulse.
  Arcs/rings/points are selectable via the three-globe `__data` mechanism
  everywhere it's used, but nothing was added to make the globe surface,
  atmosphere, or graticules selectable — those intentionally resolve to
  `null` and fall through to "deselect."
