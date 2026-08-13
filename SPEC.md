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

> **Update (2026-08-12, further session)**: user asked to convert every
> sprite in the scene to **line-intersection shapes** — sets of line
> segments radiating from a shared center point (crosses, stars, X's) —
> instead of solid meshes, framed explicitly as "we can only do the math
> for points in space at this time" (i.e. everything reduced to points +
> lines, not solid volumes). Also asked for **ground-level zoom**. New
> `src/lineShapes.ts` defines four reusable shape families, each a named
> set of vertex directions from a regular polyhedron, all sharing one
> `buildLineShape(kind, size, color)` builder:
> - `cross6` — 6 arms (octahedron vertices, +/-X/Y/Z) — a 3D "+"
> - `tetraX` — 4 arms (tetrahedron vertices) — a sharp X
> - `cubeStar` — 8 arms (cube vertices) — a denser diamond lattice
> - `star12` — 12 arms (icosahedron vertices) — a dense spiky burst
>
> Applied everywhere a sprite previously used a solid `THREE.Mesh`:
> - **Hub markers** (replacing three-globe's built-in `.pointsData()` solid
>   dots — `pointsData`/`pointLat`/`pointLng`/`pointColor`/`pointAltitude`/
>   `pointRadius` removed from the globe chain entirely): port = `cross6`,
>   air = `tetraX`, space = `star12`, depot = `cubeStar`. Built as plain
>   `THREE.Object3D`s added directly to `globe`, positioned via
>   `globe.getCoords`, tagged with `userData.selectableType = "node"` so
>   the existing click-to-inspect system needed no changes.
> - **Need-region markers**: `star12`, color amber→red by severity (as
>   before), arm length scales with `needLevel`.
> - **Moving delivery objects** (`makeModeMesh`): ship = `cross6`,
>   plane = `cubeStar`, catapult = `tetraX`, space = `star12` (still
>   unreachable in practice — see note below).
> - **Satellites** (`makeSatelliteMesh`): the old box body + two panel
>   meshes became a single `star12` shape. Since line shapes are
>   symmetric in every direction, the per-frame `sat.mesh.lookAt(0,0,0)`
>   call was dead weight and was removed.
> - **Deorbit capsules** (`spawnCapsule`): the solid cone became `tetraX`.
> - Resupply beams were already plain `THREE.Line`s — unchanged, they
>   already fit the "line intersection" idea.
>
> **Pre-existing bug noticed, not fixed**: `makeModeMesh`/`MODE_SHAPES`
> for `"space"` is still unreachable — `surfaceRoutes` (which feeds
> `movingObjects`) explicitly excludes `mode === "space"` (space routes go
> through the satellite/capsule system instead). Left as-is since it
> predates this session and wasn't part of what was asked.
>
> **Ground-level zoom**: `controls.minDistance` dropped from 104 to 101
> (globe radius is 100) — camera can now get right down to the surface.
>
> **Deferred, explicitly not done this session**: the "mechanism inside
> each object" — what a satellite, capsule, or hub is actually made of/how
> it works, visible when zoomed in close. User confirmed this is a
> separate follow-up task, to start from general assumptions based on each
> object's existing attributes (hub type, mode, severity, etc.) rather
> than being designed from scratch.
>
> **Not yet visually confirmed by the user** — build/typecheck pass
> (`npm run build`), dev server responds, but no browser tool is available
> to the agent, same limitation as every prior session's additions.

> **Update (2026-08-12, further session)**: user asked to "replace the skin
> of the earth with all the geographical information and boundaries."
> Removed the photographic `globeImageUrl`/`bumpImageUrl` texture entirely
> (`earth-night.jpg` + `earth-topology.png`) — replaced with `.globeMaterial()`
> set to a plain dark `MeshPhongMaterial` (`GLOBE_SURFACE_COLOR = 0x0b1220`),
> and a new **country boundaries layer** via three-globe's `.polygonsData()`:
> real political borders from the Natural Earth 110m admin-0 countries
> dataset, copied from `three-globe`'s own bundled example data into
> `public/data/ne_110m_admin_0_countries.geojson` (so it's committed and
> loads from this app with no external runtime dependency — fetched via
> plain `fetch("/data/...")`, same origin, no CDN). Styled as
> near-transparent fill (`polygonCapColor` ~2.5% opacity) with a bright cyan
> stroke (`COUNTRY_BORDER_COLOR = "#38bdf8"`) — the boundary *lines* are
> what read, not solid country shapes, matching the line-intersection
> aesthetic used everywhere else in the scene (see previous update on
> `src/lineShapes.ts`). Polygon fetch is async and doesn't block anything
> else in `main.ts` — markers/routes/etc. render immediately, boundaries
> populate onto the globe a moment later once the GeoJSON loads.
>
> **Not yet visually confirmed by the user** — build/typecheck pass, the
> geojson file confirmed served (200) by the dev server at
> `/data/ne_110m_admin_0_countries.geojson`, but no browser tool available
> to the agent.

> **Update (2026-08-12, further session)**: user asked to "put the names
> of all the countries inside too." Added a `.labelsData()` layer to
> `globe` (three-globe's built-in text-sprite labels), populated from the
> same `ne_110m_admin_0_countries.geojson` used for boundaries — one label
> per country (177 total), text from the `NAME` property. The dataset has
> no pre-supplied label point, so `main.ts` computes one: `ringCentroid()`
> is a shoelace-formula centroid+area over a ring's `[lng, lat]` points,
> and `countryCentroid()` picks the **largest-area ring** across a
> country's polygon(s) — needed for MultiPolygon countries (archipelagos,
> countries with overseas territories) so the label lands on the main
> landmass instead of averaging out to empty ocean between disconnected
> parts. This is a planar (lng/lat-space) centroid approximation, not
> spherical — good enough for label placement at this globe's scale, not
> claimed to be geometrically exact. Styling: `labelSize(0.42)`,
> `labelColor` a soft light-blue (`rgba(148, 197, 232, 0.85)`, dimmer than
> the boundary-line cyan so borders still read as the primary layer),
> `labelIncludeDot(false)` (no dot marker — would clutter against the
> line-shape hub/need markers already on the globe), `labelAltitude(0.008)`
> (above both the globe surface and the polygon boundary layer's `0.003`).
> Computed and set together with the boundaries in the same
> `fetch(...).then(...)` callback, once the GeoJSON loads.
>
> **Not yet visually confirmed by the user** — build/typecheck pass, same
> no-browser-tool limitation as everything else this session. Worth
> checking in-browser whether 177 simultaneous labels at world-view zoom
> is legible or too dense — no density/zoom-based filtering was added,
> since that wasn't asked for and would be premature without seeing it
> render first.

> **Update (2026-08-12, further session)**: user dropped a real dataset
> into `source_data/hdx_hapi_food_security_global.csv` — HDX HAPI's
> Food Security, Nutrition & Poverty: Food Security export
> (https://data.humdata.org/dataset/hdx-hapi-food-security, ~78MB, ~425k
> rows, IPC/CH phase classifications by country/admin1/admin2, current +
> projected periods) — and asked for a heatmap of it with click-through
> detail on "the mapped out areas" (i.e. the country boundary polygons
> already on the globe, see the "replace the skin of the earth" update
> above).
>
> **Data pipeline**: new `scripts/build_food_security_data.py` (re-run
> whenever the source CSV is refreshed) filters the raw CSV down to
> `admin_level == 0` (country), `ipc_type == "current"` (not projections)
> rows, keeps only the single most recent `reference_period_start` per
> country, and writes a compact ~50-country JSON — full phase 1-5
> population/fraction breakdown plus the combined phase-3+ ("Crisis or
> worse") figure — to `public/data/food_security_current.json` (~40KB,
> used at runtime). The 78MB source CSV was initially gitignored, then
> user asked to commit it anyway for provenance/reproducibility — it's
> tracked in the repo at `source_data/hdx_hapi_food_security_global.csv`
> (under GitHub's 100MB hard limit, though over its 50MB warning
> threshold).
> **Admin1/admin2 rows in the source data (419k of the 425k rows) are not
> used** — no sub-national boundary geometry is bundled in this project
> (only country-level, from the Natural Earth layer), so there's nothing
> to draw them against yet. Doing that would need a separate admin1/2
> boundary dataset, not a small addition — flagged as a future option, not
> started.
>
> **Heatmap**: `src/main.ts` fetches `food_security_current.json`
> alongside the boundary geojson (`Promise.all`, one combined `.then`).
> `polygonCapColor` now looks up each country's ISO3 in the loaded data and
> colors its fill via `foodSecurityFillColor()` — an IPC-style green →
> yellow → orange → red → maroon ramp (`HEATMAP_COLOR_STOPS`) keyed on the
> phase-3+ population fraction, with fill opacity also rising with
> severity. Countries with no data in the dataset (most of the world — HDX
> HAPI only covers ~50 countries with active IPC/CH monitoring) keep the
> original faint default fill (`NO_DATA_FILL`). Border stroke color is
> unchanged (still the neutral cyan boundary line) — heat is a fill-color
> signal layered on top of, not replacing, the boundary layer from the
> previous update.
>
> **Click-through detail**: `SelectableHit` gained a `"country"` variant;
> `resolveSelectable` now also matches three-globe's `__globeObjType ===
> "polygon"` tag (previously only `"arc"`/`"ring"` were handled — `"point"`
> was removed in an earlier update when hub/need markers went custom).
> Clicking a country's fill/boundary opens the same info panel used for
> everything else, showing population analyzed, the phase 3+ figure, a
> full IPC Phase 1-5 breakdown (population + %), the reference period, and
> a source attribution — or a "not available in the loaded HDX dataset"
> message for the ~120+ countries this dataset doesn't cover.
>
> **Legend**: added a 5-swatch food-insecurity severity key (Low →
> Catastrophic), reusing `HEATMAP_COLOR_STOPS` as the single source of
> truth for both the map fill and the legend swatches.
>
> **Known gap**: Cape Verde (`CPV`) is present in the HDX data but missing
> from the Natural Earth 110m country boundary set entirely (too small at
> this resolution) — its data is in `food_security_current.json` but has
> no polygon to color or click. Not fixed; would need a finer boundary
> dataset.
>
> **Not yet visually confirmed by the user** — build/typecheck pass, both
> `/data/ne_110m_admin_0_countries.geojson` and
> `/data/food_security_current.json` confirmed served (200) by the dev
> server, but no browser tool available to the agent.

> **Update (2026-08-12, further session)**: user said the delivery
> animations were "moving way too fast and not real" and initially asked
> to slow them to real time — then, mid-message, redirected: don't tune
> the speed, **halt all deliveries** instead ("we do not need to trace
> with lines for now"), and shift focus to **building out the space-based
> facilities that can grow food infinitely**. Two changes in
> `src/main.ts`:
>
> 1. **Renamed `SHOW_DISTRIBUTION_ROUTES` → `SHOW_DELIVERIES`, set to
>    `false`.** Halts arcs, ship/plane/catapult moving objects,
>    instruction rings, resupply beams, and deorbit capsules (capsules
>    halt as a side effect of `spaceRoutes` resolving to `[]`, no separate
>    gate needed). **Satellites were deliberately un-gated from this
>    flag** — they used to turn off with everything else; now they render
>    unconditionally, because the user's framing was explicit that the
>    orbital facilities are infrastructure, not a "delivery." See
>    "Deliveries toggle" section (renamed from "Distribution routes
>    toggle") for full detail.
> 2. **Built out the orbital growing facilities** — see new "Orbital
>    growing facilities" section below for detail. Short version:
>    `makeSatelliteMesh` is now a compound shape (a `star12` bioreactor
>    core + a `cross6` solar-array overlay) instead of a bare `star12`,
>    and each facility now has a production model taken directly from
>    `docs/SPACE_DELIVERY.md`'s per-unit spec table ("tens of kg
>    dehydrated protein product per week per unit") — a deliberately
>    uncapped, continuously-accumulating "food grown so far" figure shown
>    in the click panel, computed at the *real* wall-clock rate (grams
>    per real minute, not sim-accelerated), directly answering "grow food
>    infinitely" with an actual unbounded counter rather than a static
>    description.
>
> **Not yet visually confirmed by the user** — build/typecheck pass, same
> no-browser-tool limitation as everything else this session.

> **Update (2026-08-12, further session)**: user reported the orbital
> facilities were "circling the planet like once every 3-6 seconds... not
> to a NASA standard." Correct — `satellitePosition`'s `angularSpeed` was
> still using the arbitrary `(Math.PI * 2) / (20000 + (i % 3) * 4000)`
> tuning (a 20-32 **second** loop) left over from before this session's
> "build out the facilities" work, i.e. it was never actually fixed when
> the rest of the facility model went real. Replaced with a genuine
> Kepler's-third-law orbital period: new `orbitalPeriodMs(altitudeKm)` in
> `src/main.ts` computes `T = 2π√(r³/μ)` using Earth's real radius
> (6371 km) and standard gravitational parameter (μ = 398600.4418
> km³/s²), for each satellite's assigned altitude spread evenly across
> the 600-800 km range already specified in `docs/SPACE_DELIVERY.md`.
> Verified output: 96.5 min at 600 km up to 100.7 min at 800 km — in the
> right ballpark against a known reference (ISS at ~400 km is ~92.7 min
> real-world). The `Satellite` interface gained `altitudeKm`/`periodMs`
> fields; the click panel's "Altitude" row now shows the real km value
> instead of the stylized render-placement percentage, and a new
> "Orbital period" row shows the real minutes. **Important consequence,
> not a bug**: at real orbital speed, satellites will look essentially
> motionless over a normal few-minute browsing session — 97 minutes per
> revolution means only a tiny fraction of the orbit completes while
> anyone's actually watching. This is the same real-time-over-fake-motion
> tradeoff already made for the food-production counter in the previous
> update, applied consistently here rather than picking a faster "more
> watchable" fake number again.
>
> **Not yet visually confirmed by the user** — build/typecheck pass, math
> spot-checked against ISS as a reference point, but no browser tool
> available to the agent to confirm it actually reads as "barely moving"
> rather than "broken/frozen" in practice.

> **Update (2026-08-13, further session)**: user asked to (1) add more
> data and implement real granularity — "you have this huge file of
> data" (the source CSV had always had admin1/admin2-level rows, only
> admin0/country was ever used), and (2) stop using sprites for "need" —
> the whole need-severity concept should be a heatmap, not points. Two
> substantial pieces of work, both in service of the same goal (a real
> "need map"):
>
> **1. Admin1 (state/province) granularity, new boundary source.** The
> HDX CSV's `admin1_code` doesn't correspond to any bundled or
> easily-joinable boundary dataset (checked: it's each country's own
> COD/OCHA p-code scheme, e.g. `KE033`, which doesn't match Natural
> Earth, geoBoundaries, or ISO 3166-2 codes). `scripts/build_food_security_data.py`
> was rewritten to also: fetch real admin1 boundary polygons per-country
> from [geoBoundaries.org](https://www.geoboundaries.org/) (open license,
> simplified geometry, cached in `source_data/admin1_raw/` — gitignored,
> re-derivable), and join HDX's `admin1_name` (falling back to
> `provider_admin1_name`) to geoBoundaries' `shapeName` by **normalized
> string match within the same country** — there is no shared ID space
> between the two datasets, so this is the only available join key.
> **Match rate: 509/816 HDX admin1 regions (62.4%)** — see the script's
> console output for the full per-country breakdown and every unmatched
> region name. The shortfall isn't random: several countries' HDX rows
> are FEWS NET livelihood zones or ethnic/cultural sub-regions rather
> than official administrative units (Eswatini's "Dry middleveld",
> Uganda's "Karamoja"/"Lango"/"Tooro", Kenya's "Marsabit - moyale" style
> sub-county breakdowns) — those were never going to match an
> administrative boundary dataset by name, match or no match. A handful
> of countries matched 0 admin1 regions entirely (Burundi, Gambia,
> Tanzania, Uganda) — those countries fall back to their country-level
> heat fill instead (see layering below), not to nothing.
>
> Outputs: `public/data/admin1_boundaries.geojson` (509 matched features,
> ~8.8MB — lean properties, only `shapeID`/`shapeName`/`locationCode` +
> geometry) and `public/data/food_security_admin1.json` (~443KB, keyed by
> `shapeID`).
>
> **2. Need sprites removed entirely, data model cleaned up.** The
> hand-authored "need" node kind — 13 illustrative points with a fake
> 0-1 `needLevel`, rendered as `star12` sprites — is gone from
> `src/data/nodes.ts`. `DeliveryNode` is now hub-only (`kind` field
> dropped, `hubType` is required not optional). Since `src/data/routes.ts`
> used those need-node ids as delivery destinations, routes were changed
> to carry inline `toLat`/`toLng`/`toName` instead of a `to: string` node
> reference — the same 7 destination coordinates that were actually used
> by a route carried forward; the other 6 illustrative need points that
> no route ever targeted were dropped outright (they had no purpose left
> once the sprite was gone). Every place in `src/main.ts` that branched on
> `node.kind` (marker builder, `getPointColor`, `describeSelection`'s
> `"node"` case, the `spaceHubs` filter) was simplified to hub-only.
>
> **Heatmap layering**: `globe.polygonsData()` now takes one merged array
> of country features (from the existing Natural Earth layer) *and*
> admin1 features together — three-globe only supports a single named
> polygon layer, so `isAdmin1Feature()` (checks for a `shapeID` property)
> discriminates between the two feature shapes inside the shared
> `polygonCapColor`/`polygonStrokeColor`/`polygonAltitude` accessor
> functions. Admin1 polygons render at a slightly higher altitude (0.004
> vs country's 0.003) with a distinct border color (`ADMIN1_BORDER_COLOR`,
> pink, vs the country layer's cyan) so the two are visually
> distinguishable. **Country-level heat fill was deliberately kept, not
> replaced** — it's the fallback for the ~38% of HDX regions with no
> admin1 match and the 4 countries with zero matches, so those places
> still show real (if coarser) data instead of nothing. Clicking either
> layer opens the same info panel shape (`foodSecurityDetailRows()`,
> factored out of the old country-only code since both cases needed
> identical phase-breakdown rendering) — `SelectableHit` gained an
> `"admin1"` variant alongside `"country"`.
>
> **Not yet visually confirmed by the user** — build/typecheck pass, all
> four data files (`ne_110m_admin_0_countries.geojson`,
> `food_security_current.json`, `admin1_boundaries.geojson`,
> `food_security_admin1.json`) confirmed served (200) by the dev server,
> but no browser tool available to the agent — worth checking in
> particular whether the two-layer altitude/color separation actually
> reads clearly rather than looking like rendering noise where admin1
> regions are small relative to their country.

> **Update (2026-08-13, further session)**: user reported "Chrome is
> pegged at 100 percent - it cannot process it" trying to view the
> above. Root-caused via `journalctl`: Chromium was actually
> **crash-looping** — "trap invalid opcode" (SIGILL), at the *identical*
> instruction pointer both times it happened, i.e. a deterministic crash,
> not random OOM. Each crash triggers `systemd-coredump` to write a full
> memory dump (one attempt alone had a 6.3GB memory peak) — that's what
> was actually filling the disk to 0 bytes free mid-session (not
> anything this app writes to disk itself; it's a pure client-side WebGL
> page with zero file I/O). The machine's GPU is an old 2012-era Intel HD
> Graphics 4000 (Ivy Bridge) — plausible that the admin1 heatmap's ~700
> polygon meshes (added the same session) pushed its driver stack past
> what it handles.
>
> Three perf fixes in `src/main.ts`, all aimed at reducing that load
> without changing what's visible:
> 1. **Pointermove hover raycast was uncapped** — every raw mousemove
>    event (100+/sec on a fast mouse) triggered a full
>    `raycaster.intersectObject(globe, true)` against all ~700 polygon
>    meshes just to update the cursor. Now coalesced to at most one
>    raycast per rendered frame via `requestAnimationFrame` — extra
>    events between frames just update `latestHoverEvent` and return.
>    This was almost certainly the single biggest offender.
> 2. **`renderer.setPixelRatio` was uncapped** at `window.devicePixelRatio`
>    — on a high-DPI display this can be 2-3x, which is 4-9x the
>    fragment-shader/pixel workload for marginal visual benefit past 2x.
>    Now `Math.min(window.devicePixelRatio, 2)`.
> 3. **Polygon layer defaults were untouched from three-globe's generic
>    defaults**, which don't account for having ~700 polygons at once:
>    `polygonCapCurvatureResolution` (default 5°, how finely each polygon
>    edge is subdivided to follow the globe's curvature) raised to 20° —
>    not visually meaningful except at extreme close-up zoom, meaningfully
>    cheaper on weak GPUs. `polygonsTransitionDuration` (default 1000ms,
>    animates in new polygon geometry on data change) set to 0 — with
>    this many polygons, animating the initial load in over a second was
>    itself real work happening right at page load.
>
> **Not a complete fix, a mitigation** — none of this reduces the actual
> polygon/vertex count, just the per-frame and per-event overhead around
> it. If the crash recurs, the next lever is reducing admin1 geometry
> complexity itself (the geoBoundaries "simplified" files are still fairly
> detailed) or dropping polygon count for the smallest/least-visually-
> significant admin1 regions. **Not yet confirmed by the user whether this
> actually stops the crash** — no browser tool available to the agent to
> reproduce/verify; build/typecheck pass and the dev server is confirmed
> serving again after the disk was freed.

> **Update (2026-08-13, further session): move heatmap rendering to a
> baked texture.** The mitigations above didn't fix it — user reported
> Chrome still frozen/pegged. Asked "should we move some processing
> server side?" — yes, and specifically: the crash signature (SIGILL,
> deterministic instruction pointer, not OOM) reads like a GPU driver
> crash from the ~700 live `ConicPolygonGeometry` meshes (one per country/
> admin1 region), not a plain CPU-bound perf problem — the prior fixes
> reduced overhead *around* that rendering path without removing the path
> itself. This update removes it entirely.
>
> **What changed**: `scripts/build_food_security_data.py` now also
> rasterizes the whole heatmap — country fills, admin1 fills, both
> boundary-line layers — into one equirectangular PNG
> (`public/data/heatmap_texture.png`, 4096x2048, ~0.2MB, via Pillow — new
> dependency, `pip install pillow`) using the same color ramp
> (`HEATMAP_COLOR_STOPS`) and opacity-over-base-color compositing the old
> live `polygonCapColor` accessor used, just computed once at build time
> instead of every frame. `src/main.ts` applies this as
> `globeMaterial.map` via `THREE.TextureLoader`, and **`.polygonsData()`
> is gone entirely** — along with `polygonCapColor`/`polygonStrokeColor`/
> `polygonAltitude`/`polygonCapCurvatureResolution`/
> `polygonsTransitionDuration` and the `foodSecurityFillColor`/
> `NO_DATA_FILL`/`COUNTRY_BORDER_COLOR`/`ADMIN1_BORDER_COLOR` constants
> that fed it (all now Python-side only, in the build script;
> `HEATMAP_COLOR_STOPS` stays in `main.ts` too, but only for the legend
> swatches now, not for coloring anything on the globe).
>
> **Click-to-inspect had to be redesigned**, since there's no mesh per
> region to raycast against anymore: country + admin1 GeoJSON is still
> fetched client-side (needed for country name labels and now for this),
> kept in module-level `countryFeatures`/`admin1Features` arrays. On
> click, `pickClickTarget()` first tries the existing mesh-only pick
> (hubs/satellites/capsules/beams/arcs/rings, unchanged); if that misses
> and the ray hit the bare globe sphere (three-globe tags it
> `__globeObjType === "globe"`), the click's lat/lng is read via
> `globe.toGeoCoords(intersect.point)` and resolved with a plain
> point-in-polygon test (`resolveRegionAt` → `pointInPolygon` →
> `ringContains`, standard crossing-number algorithm, holes ignored, same
> simplification already used for centroid math) against the admin1 array
> first, then the country array. **Deliberately click-only, not
> hover** — `pickAt()` (used by the throttled pointermove hover handler)
> stays mesh-only on purpose, so hover doesn't pay the point-in-polygon
> cost on every frame; only an actual click does the extra work, which is
> negligible run once.
>
> **Known limitation, not fixed**: the equirectangular texture bake has
> the standard antimeridian-crossing artifact — countries whose polygon
> crosses ±180° longitude (Russia, Fiji, a few Pacific nations) draw a
> spurious near-full-width band at the projection's wrap edge. Documented
> in the bake script, not corrected (would need to split those polygons
> at the antimeridian before rasterizing).
>
> **Visually confirmed by the agent this time** (not the user) — the
> baked texture was read back and inspected: country/admin1 boundaries
> and heat fills align correctly with real geography, colors match the
> intended ramp. Build/typecheck pass, dev server confirmed serving
> `heatmap_texture.png` (200) alongside the other four data files. What's
> *not* yet confirmed: whether this actually stops the Chromium crash on
> the user's machine — that can only be confirmed by trying it there.

> **Update (2026-08-13, further session): confirmed fixed, then lines
> restored as vector geometry.** User confirmed the crash is gone. Then:
> "the lines of the countries are blurred - we want them to be svg like
> lines again, and all you need to render is the colors" — right
> diagnosis. The previous update baked *both* fill color and boundary
> lines into the raster texture; a 1px rasterized line texture-filtered
> onto a sphere reads as soft/blurry, which is what was noticed. The fix
> is exactly what the user described: **texture carries fill color only
> now** (`bake_heatmap_texture` no longer calls `draw_stroke` at all —
> that function and the now-unused `COUNTRY_BORDER_COLOR`/
> `ADMIN1_BORDER_COLOR` Python constants were deleted), and boundary
> lines came back as real vector geometry client-side — but NOT
> three-globe's `.polygonsData()` (the `ConicPolygonGeometry`-per-region
> approach that caused the crash in the first place). Instead: plain
> `THREE.LineSegments`, built directly from the same GeoJSON already
> being fetched for labels and click detection. New `addBoundaryLines()`
> in `src/main.ts` walks every polygon ring, converts each `[lng,lat]`
> point to a 3D position via `globe.getCoords()`, and pushes consecutive
> point-pairs into one shared vertex buffer — **one `LineSegments` object
> per layer (country, admin1), i.e. 2 draw calls total**, not one line
> object per region (~700 would still have been fine, since lines are
> cheap regardless, but merging costs nothing extra to do and is strictly
> more headroom). Each line's `.raycast` is overridden to a no-op so
> these ~700 combined regions add zero cost to hover/click picking.
> Rendered at `LINE_ALTITUDE = 0.0015` (just above the texture surface,
> avoids z-fighting).
>
> **"we keep everything aligned through code"**: both the texture bake
> (Python) and these vector lines (TypeScript) — plus the point-in-polygon
> click lookup — all read the *same* GeoJSON files
> (`ne_110m_admin_0_countries.geojson`, `admin1_boundaries.geojson`).
> There's no second copy of boundary geometry anywhere to drift out of
> sync; a `geometryPolygons()` helper was factored out (previously
> duplicated inline in `countryCentroid`/`pointInPolygon`) so all three
> consumers normalize Polygon/MultiPolygon the same way.
>
> **Verified without the user this time**: read the regenerated
> fill-only texture back and confirmed it has *no* lines and — more
> importantly — that countries with no HDX food-security data are now
> **completely invisible** in the texture (no fill, and formerly relied
> on the baked line for any shape at all). This confirms restoring the
> vector line layer isn't just a crispness fix, it's required for the
> rest of the world's country shapes to be visible at all now that the
> texture doesn't carry them. Build/typecheck pass, dev server confirmed
> serving. See the new "Heatmap rendering architecture" section below for
> the consolidated current-state description (the update banners above
> are the chronological history of how it got here; that section is the
> "how it actually works right now" reference).

> **Update (2026-08-13, further session): standardized IPC colors,
> per-region boundary lines, and a new "starvation zones" marker layer.**
> User: "we still do not seem to have starvation mapped out correctly...
> fix the lines for all countries, and standardize the food insecurity
> color codes and descriptions, and then search the 80mb file for the
> rest of the data you need to create starvation zones." Three changes:
>
> 1. **Discrete IPC classification, not a continuous fraction ramp.**
>    Country/admin1 fill and line color used to be a green→maroon
>    gradient keyed on the raw Phase-3+ population fraction
>    (`HEATMAP_COLOR_STOPS`, an invented ramp). Replaced with the actual
>    IPC/CH convention: `classify_area_phase()` (Python) assigns each area
>    a single discrete phase 1-5 — the highest phase P where ≥20% of the
>    analyzed population is in phase P or worse (the standard IPC "20%
>    threshold" rule) — stored as `areaPhase` in
>    `food_security_current.json` / `food_security_admin1.json`. Colored
>    with the actual IPC cartographic standard 5-color palette
>    (`IPC_PHASE_COLORS`, `#cdfacd`→`#fae61e`→`#e67800`→`#c80000`→`#640000`
>    for Minimal→Stressed→Crisis→Emergency→Catastrophe/Famine), mirrored
>    by hand in both `scripts/build_food_security_data.py` and
>    `src/main.ts` (same pattern this file already used for the old ramp).
> 2. **Boundary lines now colored by each region's own classification.**
>    Previously a flat cyan (country) / pink (admin1) regardless of data —
>    despite already having a fill-color heatmap, the lines themselves
>    carried no severity information, which is what read as "starvation
>    not mapped out correctly." `addBoundaryLines()` in `src/main.ts` now
>    takes a per-feature color function instead of one flat color, using a
>    vertex-color buffer attribute so it's still 2 draw calls total (not 2
>    per region) — a country/admin1 with no HDX data gets a neutral gray
>    (`NO_DATA_COLOR`) outline instead of disappearing.
> 3. **New "starvation zones" layer, from admin2 (district) rows.** The
>    source CSV has ~154k admin2-level "current" rows that were never
>    used (only admin_level 0/1 were processed before) — the "rest of the
>    data" the user pointed at. `build_admin2_zones()` classifies every
>    admin2 row the same way (`classify_area_phase`) and keeps the ones at
>    Phase 4 (Emergency) or 5 (Catastrophe/Famine): 315 zones across 14
>    countries (AGO, BFA, COD, DJI, ETH, HTI, LBN, MOZ, NGA, PSE, SDN, SOM,
>    SSD, YEM) as of this HDX export — includes e.g. Gaza governorates and
>    Zamzam IDP Camp (Darfur), both real declared-famine areas. Many admin2
>    names in this dataset are informal (IDP camps, named operational
>    clusters, "X Urban"/"X Rural" splits) rather than real administrative
>    units, so most won't match a geoBoundaries polygon — each zone still
>    gets *a* point via a 3-tier fallback (matched ADM2 boundary centroid →
>    parent admin1 centroid → country centroid, recorded per-zone as
>    `locationSource`); of 315, 202 matched an actual district boundary, 64
>    fell back to admin1, 49 to country. Written to the new
>    `public/data/starvation_zones.json`. Rendered client-side as small
>    pulsing `tetraX` markers (`buildZoneMarker` in `src/main.ts`, size by
>    phase, color from the same `IPC_PHASE_COLORS` table), fully
>    click-to-inspect (new `"zone"` `SelectableHit` case).
>
> **A real bug found and fixed along the way**: `latest_current_rows()`
> deduped "keep only the most recent period per region" by the *raw*
> region name string. The source CSV spells the same region inconsistently
> across export periods (e.g. `"Deir al-balah & khan younis governorates"`
> vs `"Deir al Balah & Khan Younis Governorates"`), so two capitalization
> variants of Gaza were being treated as different locations and BOTH kept
> — a stale Feb-2024 famine record sitting right next to the current
> Sept-2024 one, as if they were two separate places. Fixed by grouping on
> a light case/punctuation-normalized key (`normalize_key_name`) while
> still storing the real display name from whichever period wins
> (`display_names` return value) — deliberately a *lighter* normalization
> than `normalize_name()`'s admin-unit-suffix stripping (used only for
> matching against geoBoundaries), since that stripping would have
> incorrectly merged genuinely distinct rows like "X Urban" vs "X Rural"
> into one. Dropped the zone count from 330 candidates to 315 (net of the
> Gaza-type duplicates); admin1 matched-feature count went 509→511 (a few
> regions that previously lost a duplicate-shapeID race now resolve to the
> correct period's data instead).
>
> Verified: `npm run build` (tsc + vite build) passes clean, all 5
> `public/data/*.json`/`.geojson`/`.png` outputs regenerated and served
> (200) by the dev server, `starvation_zones.json` spot-checked (Gaza no
> longer duplicated, phase breakdowns sum sensibly). **Not yet confirmed
> by the user visually** — dev server was already running in the user's
> own browser when this session started; not independently screenshotted
> by the agent this time (no headless browser tool available in this
> environment — `chromium-cli` and `playwright` were both absent, and
> installing Playwright's browser binary was judged not worth the
> download for a data/color change verifiable by direct JSON/pixel
> inspection instead).

> **Update (2026-08-13, same session): starvation zones became a flat
> baked "highlighter" fill, not a 3D marker.** User: "we need new 2D
> shapes for food starvation — we need to get rid of the line
> intersection requirement here — let's just turn it into a flat
> selection of the area like we are using a highlighter." The previous
> update rendered each zone as a client-side `tetraX` line-shape sprite
> (this project's shared "line intersections radiating from a point"
> visual vocabulary, `src/lineShapes.ts` — used everywhere else: hubs,
> satellites, moving objects, capsules). That's exactly what the user
> wanted removed for this layer specifically — a starvation zone isn't a
> point facility, it's an *area*, and should read as one.
>
> **What changed**: zone highlights are now baked directly into
> `public/data/heatmap_texture.png` as a third layer (country fill ->
> admin1 fill -> zone highlight, in that order, so zones always draw on
> top) — `draw_zone_highlight()` in `scripts/build_food_security_data.py`,
> a bold near-opaque fill (`ZONE_HIGHLIGHT_OPACITY = 0.88`, higher than
> the regular `IPC_PHASE_OPACITY` table so it visually pops) plus a
> crisp 4px full-strength outline, meant to read like a highlighter pen:
> translucent body, slightly more defined edge. Two cases:
> - **Zones with a matched admin2 boundary** (202 of 315): the *real*
>   district polygon is highlighted — `build_admin2_zones()` now also
>   returns the matched geometry (previously it computed the centroid
>   and threw the polygon away), written to the new
>   `public/data/starvation_zone_boundaries.geojson` (same shape as
>   `admin1_boundaries.geojson`: `FeatureCollection`, keyed by a
>   `zoneId` property).
> - **Zones with no matched boundary** (113 of 315 — informal/operational
>   names like IDP camps that don't correspond to a real administrative
>   unit): a synthetic circle (`ellipse_ring()`, radius
>   `FALLBACK_ZONE_RADIUS_DEG` — 0.45° for Phase 4, 0.65° for Phase 5,
>   still severity-scaled like the old marker's size was) centered on the
>   same admin1/country centroid fallback point as before. Each zone's
>   `fallbackRadiusDeg` (null when a real boundary matched) is written to
>   `starvation_zones.json` so the client can replicate the same circle
>   for click hit-testing.
>
> **Click-to-inspect had to move too** — there's no mesh to raycast
> anymore, so `resolveRegionAt()` in `src/main.ts` now checks starvation
> zones *first* (before admin1, before country — the most specific,
> highest-severity layer wins): point-in-polygon against
> `zoneBoundaryFeatures` for matched zones, or a plain angular-distance
> check (`withinFallbackZone`, `Math.hypot(Δlat, Δlng) <=
> fallbackRadiusDeg`) for the circle fallback — same math the bake
> script's `ellipse_ring()` used to draw it, so the clickable area and
> the visible highlight agree. `buildZoneMarker`, the `zoneMarkers` array,
> `ZONE_ALTITUDE`, and the per-frame pulse animation were deleted
> entirely — nothing about starvation zones is a scene-graph object
> anymore, they're pure texture + click-hit-test data.
>
> Why this doesn't reopen the Chromium-crash question: the crash was from
> ~700 *live, extruded, curvature-subdivided* `ConicPolygonGeometry`
> meshes recalculated in the render loop. This is 315 flat `ImageDraw`
> polygon fills done once, offline, in Python, at build time — the exact
> same technique (and even the exact same `polygon_rings`/`lnglat_to_px`
> helpers) already proven safe for the country/admin1 heatmap layer. Zero
> new client-side geometry, zero new draw calls — if anything this is
> *less* client-side work than the marker version it replaced (no more
> per-frame pulse scale update on 315 objects).
>
> Verified: `npm run build` passes clean. Re-ran the build script;
> `starvation_zone_boundaries.geojson` has 202 features. Pixel-sampled
> the regenerated texture at a matched zone's centroid and at a fallback
> zone's centroid — both landed exactly on the expected highlight color
> (`heat_color`-style pre-composite at `ZONE_HIGHLIGHT_OPACITY`), verified
> by direct RGB comparison in Python, not by eye. Not yet visually
> confirmed by the user in-browser (see the note on headless-browser tool
> availability in the update above — unchanged this session).

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

## Deliveries toggle (renamed from "distribution routes toggle")

**Renamed and re-scoped in the 2026-08-12 "halt deliveries" session** (see
update banner near the top): `SHOW_DISTRIBUTION_ROUTES` is now
`SHOW_DELIVERIES`, currently **`false`**. User feedback was that the arc/
moving-object animation speeds were arbitrary — "moving way too fast and
not real" — and rather than guess at real-world transit speeds, the
decision was to halt delivery motion entirely for now, not tune it.

- Single switch: `SHOW_DELIVERIES` constant near the top of `src/main.ts`.
- When `false`: `physicalRoutes` and `instructionRoutes` resolve to `[]`,
  cascading to empty `arcsData`/`ringsData`/`movingObjects`, and (since
  `spaceRoutes` also resolves to `[]`) an empty `capsuleSpawners` — no
  arcs, no ship/plane/catapult objects, no instruction rings, no deorbit
  capsules. Resupply beams are also gated on this flag now (a line trace,
  same as everything else halted). The legend drops its per-mode rows
  when the flag is off.
- **Satellites are the one exception, and this is a deliberate change from
  before**: the orbital growing facilities used to be gated on this same
  flag (when it was `SHOW_DISTRIBUTION_ROUTES`) — they no longer are.
  `satellites` now renders **unconditionally**, regardless of
  `SHOW_DELIVERIES`, because the user's framing was explicit: the
  satellites are persistent infrastructure ("space based facilities"),
  not a "delivery" — halting deliveries should not also remove them. See
  "Orbital growing facilities" section below for what was built out on
  top of them in the same session.
- **To resume deliveries**: flip `SHOW_DELIVERIES` back to `true` — no
  other changes needed. Revisiting *how fast* things move (the original
  complaint) is still open; this session halted motion rather than tuning
  it, see the update banner for why.

## Real hub/need-region dataset

**Historical — the "need-regions" part of this section is superseded.**
See the 2026-08-13 "add more data... implement granularity" update banner
near the top: the hand-authored need-region points and `needLevel`
described below were removed entirely (no more sprites for need at all),
replaced by the real HDX admin1/admin0 heatmap. The **hub** dataset
described below is still accurate and current.

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
  delivered" beyond removal. **Orbital speed is no longer an arbitrary
  tuning** — see the "circling every 3-6 seconds... not to a NASA
  standard" update further up, `angularSpeed` is now a real Kepler's-third-
  law period. Inclination/RAAN/phase spread across the 8 satellites is
  still aesthetic tuning, not derived from anything — only the speed was
  fixed, not the constellation geometry.
- **Still not visually confirmed by the user** as of this write-up — same
  caveat as everything else added without a browser tool available to the
  agent. Check the constellation is actually visible/reasonable-looking at
  the default camera distance (350, per `camera.position.set` near the top
  of `src/main.ts`) before trusting this description further.

## Orbital growing facilities

Added in the same "halt deliveries, build out the space facilities"
session as the deliveries toggle rename above. Two independent changes,
both in `src/main.ts` near the `Satellite` interface:

- **Compound facility shape**: `makeSatelliteMesh()` used to return one
  bare `star12` line shape. It's now a `THREE.Group` with two parts, both
  still built from `src/lineShapes.ts` primitives (no new geometry
  system): a smaller `star12` (`size 1.6`) standing in for the
  bioreactor/fermenter cluster, plus a larger `cross6` (`size 3.2`,
  cyan) standing in for the solar array booms. Reads as a facility with
  distinct parts rather than one generic point marker.
- **Production model**: `FOOD_OUTPUT_KG_PER_WEEK = 40` and
  `foodGrownGrams(elapsedMs)` are taken directly from
  `docs/SPACE_DELIVERY.md`'s per-unit spec table ("Food output: Tens of
  kg dehydrated protein product per week per unit — baseline for pilot
  testing, not a delivered fact") — 40 is the chosen midpoint of "tens of
  kg." `foodGrownGrams` is a pure function of elapsed wall-clock time
  (`FOOD_OUTPUT_KG_PER_WEEK * 1000 * elapsedMs / WEEK_MS`) — no per-unit
  state to track, every facility produces at the same rate starting from
  sim load. Deliberately uncapped: there's no ceiling in the formula, so
  the number only ever grows, for as long as the page stays open — this
  is the literal implementation of "grow food infinitely," not just a
  descriptive label.
- Clicking a satellite (`describeSelection`'s `"satellite"` case) now
  shows `Bioreactor` (`BIOREACTOR_TYPE`, quoting the "Spirulina/algae
  photobioreactor + gas-fermentation microbial protein" growing-tech
  decision from `docs/SPACE_DELIVERY.md`), `Output rate`, and `Grown so
  far (real time, unbounded)` in grams (2 decimal places — at the
  real-world weekly rate, a typical browsing session only accumulates a
  few grams, which is the point: this is real-time production, not the
  fast/fake motion the user objected to elsewhere in the scene) —
  computed live at click time from `latestElapsedMs`, same established
  pattern as satellite position and capsule reentry progress (see
  "Selection / info panel" below — values aren't continuously refreshed
  while the panel is open, only recomputed on click, consistent with how
  every other live value in this system already works).
- Title changed from "Orbital Platform N" to "Orbital Growing Platform N";
  subtitle from "Autonomous food-growing satellite" to "Autonomous
  closed-loop food-growing facility" — matches the "facility" framing
  used everywhere else in this update.
- Not yet done: satellite count is still fixed at 8
  (`SATELLITE_COUNT`), unrelated to production capacity — growing the
  fleet and growing per-unit output are two different levers, only the
  latter has a model right now. No visual differentiation between a
  freshly-"launched" facility and a long-running one (no per-unit start
  time, all facilities are assumed operational since sim load).

## Heatmap rendering architecture

This is the *current-state* reference for how the food-security heatmap
actually renders — the update banners near the top of this file are the
chronological history of how it got here (three different rendering
approaches, in order: live `.polygonsData()` meshes → everything baked
into one texture including lines → this). Read this section for "how
does it work right now"; read the banners for "why does it work this
way."

**Three pieces, two languages, one source of truth:**

1. **Fill color — baked raster texture, discrete IPC classification.**
   `scripts/build_food_security_data.py`'s `bake_heatmap_texture()`
   rasterizes country and admin1 polygon fills (only fills, no lines)
   into `public/data/heatmap_texture.png` — a 4096x2048 equirectangular
   PNG. Each area's color comes from `classify_area_phase()` (the
   standard IPC "20% rule": highest phase P where ≥20% of the analyzed
   population is in phase P or worse) looked up in the standard IPC
   5-color palette (`IPC_PHASE_COLORS` — mirrored by hand in both the
   Python script and `src/main.ts`, same as before but now 5 discrete
   phase colors instead of a continuous fraction-keyed ramp), pre-
   composited over the dark base color at a per-phase opacity
   (`IPC_PHASE_OPACITY`) since there's no separate transparent sphere for
   it to blend against anymore. `src/main.ts` loads this via
   `THREE.TextureLoader` and assigns it to `globeMaterial.map` — one
   texture, applied to the globe's existing base sphere. This is the
   *only* thing the raster texture is responsible for: color, nothing
   else.
2. **Boundary lines — vector geometry, colored per-region, not baked.**
   `addBoundaryLines()` in `src/main.ts` builds one `THREE.LineSegments`
   per layer (country, admin1 — 2 draw calls total) directly from the
   GeoJSON, positioned via `globe.getCoords()` at `LINE_ALTITUDE`
   (0.0015, just above the surface). Each region's line segments are
   colored by that region's *own* `areaPhase` (a vertex-color buffer
   attribute, not a material color — still only 2 draw calls total, not
   one per region) via the same `IPC_PHASE_COLORS` table the fill uses; a
   region with no HDX data gets a neutral gray (`NO_DATA_COLOR`) outline
   instead of a flat cyan/pink regardless of data, which is what
   previously made the lines carry no severity information of their own.
   Crisp at any zoom because it's real line geometry, not a sampled
   texture — not baked into the texture because a 1px rasterized line
   reads as blurry once texture-filtered onto a sphere (tried that first,
   it didn't work). Each line's `.raycast` is a no-op so this costs
   nothing in hover/click picking.
3. **Starvation zones — a third baked fill layer, on top, not a marker.**
   Admin2 (district) rows classified Phase 4+ by the same
   `classify_area_phase()` rule become `public/data/starvation_zones.json`
   plus `public/data/starvation_zone_boundaries.geojson`
   (`build_admin2_zones()` in the Python script) — see the "flat 2D
   highlighter zones" update banner above for the full rationale. Baked
   into the *same* `heatmap_texture.png` as a third pass
   (`draw_zone_highlight()`, called after the country/admin1 fills so
   zones always draw on top): the real matched district polygon where
   `starvation_zone_boundaries.geojson` has one, or a synthetic circle
   (`ellipse_ring()`, radius `FALLBACK_ZONE_RADIUS_DEG`) centered on the
   admin1/country fallback centroid otherwise. Not a `src/main.ts` scene
   object at all — no marker, no `LineSegments`, nothing added to `globe`
   for this layer.
4. **Click-to-inspect — point-in-polygon (and one distance check),
   not raycasting any of the three layers above.** None of the texture,
   the boundary lines, or the zone highlights are individually clickable
   as scene objects. A click that doesn't hit a real mesh (hub marker,
   satellite, etc.) gets resolved by raycasting the bare globe sphere for
   a surface point, converting to lat/lng via `globe.toGeoCoords()`, and
   testing that point against the same GeoJSON/zone data
   (`resolveRegionAt`): starvation zones checked first (point-in-polygon
   against `zoneBoundaryFeatures` for matched zones, a plain angular-
   distance check against `fallbackRadiusDeg` for circle zones — same
   math the bake script used to draw it, kept in sync by hand), then
   admin1, then country — most specific/severe layer wins when several
   overlap at one point.

**The "single source of truth" part**: the Python texture bake and the
TypeScript vector lines/click detection read the *same* GeoJSON files —
`public/data/ne_110m_admin_0_countries.geojson`,
`public/data/admin1_boundaries.geojson`, and, for the zone layer,
`public/data/starvation_zone_boundaries.geojson`. There's no second,
independent copy of boundary geometry anywhere. Regenerate the texture
(`python3 scripts/build_food_security_data.py`) and the fill colors
change; the lines and click detection automatically still line up
because they were never a separate dataset to begin with.

**Why not three-globe's `.polygonsData()` for any of this** — that was
the original approach (one `ConicPolygonGeometry` mesh per country/admin1
region, ~700 total: extruded cap + side + stroke, curvature-subdivided).
It crashed Chromium (SIGILL, confirmed via `journalctl`, on a machine
with older integrated graphics) — see the "move heatmap rendering to a
baked texture" update. Nothing in the current design uses that API at
all anymore for the heatmap.

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
  all ten selectable kinds (`node`, `arc`, `ring`, `moving`, `satellite`,
  `capsule`, `beam`, `country`, `admin1`, `zone`) so `describeSelection`'s
  switch is exhaustively typed.
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
