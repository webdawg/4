# Session dump — Food Relief Network (repo `4`) — 2026-08-12 to 2026-08-13

Repo: https://github.com/webdawg/4 (renamed from `food-relief-network`),
local path `/home/webdawg/DATA/CODE/4`. This file is a chronological
record of one long multi-day working session, for feeding back into a
future LLM context cold. `SPEC.md` in the repo itself is the canonical,
more detailed running log — this is a compressed narrative version of the
same period plus the repo-management steps that happened outside the repo.

## 0. Repo housekeeping (outside the app itself)

- User has GitHub repos numbered `1`, `2`, `3`, `4`... Cloned `2` and `3`
  into `/home/webdawg/DATA/CODE/` (1 was already local).
- `food-relief-network` repo was actually meant to be `4` — renamed via
  `gh repo rename`, then cloned locally as `4`.
- Installed deps (`npm install`), documented them in `DEPENDENCIES.md`,
  started the Vite dev server (`npm run dev`, pinned to port 60004 by
  `vite.config.ts` from an earlier session).

## 1. App background (from SPEC.md / docs/, pre-existing before this
   session)

**Food Relief Network**: a 3D browser globe simulation (Vite + TypeScript
+ Three.js/three-globe) visualizing a hypothetical global food-delivery
system across five modes (ship, plane, space/orbital, catapult,
knowledge-broadcast "instructions"). Real hub locations (ports, air cargo,
orbital launch sites, UN WFP depots). `docs/SPACE_DELIVERY.md` and
`docs/GLOBAL_FOOD_SYSTEM.md` are prior strategic-design docs (not all
implemented in code).

## 2. Line-intersection sprites + ground zoom

User wanted every sprite (hubs, moving delivery objects, satellites,
capsules) converted from solid Three.js meshes to shapes made of line
segments radiating from a shared center point ("line intersections") —
crosses, stars, X's — plus the ability to zoom to ground level.

- New `src/lineShapes.ts`: 4 reusable shape families, each a named set of
  vertex directions from a regular polyhedron (`cross6` 6-arm/octahedron,
  `tetraX` 4-arm/tetrahedron, `cubeStar` 8-arm/cube, `star12`
  12-arm/icosahedron), one `buildLineShape(kind, size, color)` builder.
- Applied to hub markers (replacing three-globe's built-in solid point
  dots), need-region markers (later removed entirely, see §5), moving
  delivery objects, satellites, deorbit capsules.
- `controls.minDistance` dropped 104 → 101 (globe radius 100) for
  ground-level zoom.

## 3. Earth texture replaced with vector country boundaries + heatmap

- Removed the photographic `globeImageUrl`/`bumpImageUrl` texture,
  replaced with a plain dark `globeMaterial`.
- Added real country boundaries via three-globe's `.polygonsData()`,
  Natural Earth 110m data copied from `three-globe`'s own bundled example
  assets into `public/data/ne_110m_admin_0_countries.geojson`.
- Added country name labels via `.labelsData()`, positioned at each
  country's largest-polygon-ring centroid (custom shoelace-formula
  centroid code, handles MultiPolygon countries).
- User then supplied a real dataset: `source_data/hdx_hapi_food_security_global.csv`
  (HDX HAPI Food Security export, ~78MB, ~425k rows, IPC/CH phase
  classification data, https://data.humdata.org/dataset/hdx-hapi-food-security).
  Built `scripts/build_food_security_data.py` to derive a per-country
  snapshot (`public/data/food_security_current.json`) and colored country
  polygon fills by Phase-3+ ("Crisis or worse") population share, IPC-style
  green→yellow→orange→red→maroon ramp. Countries made clickable with a
  full phase breakdown in the info panel.

## 4. Committed the source CSV to git

Initially gitignored the 78MB CSV; user explicitly asked to commit it
anyway for provenance/reproducibility. Committed + pushed (GitHub warns
above 50MB but allows up to 100MB — went through fine).

## 5. Halt deliveries; real orbital physics; granular need heatmap;
   remove need sprites

Several related asks in one extended exchange:

- **"moving way too fast, not real"** → user first asked to slow to real
  time, then pivoted mid-message to **halt all deliveries entirely**
  instead of tuning speed. `SHOW_DISTRIBUTION_ROUTES` renamed to
  `SHOW_DELIVERIES`, set `false`. Satellites deliberately **un-gated**
  from this flag — they're infrastructure ("space based facilities"), not
  a delivery, so they keep rendering/orbiting regardless.
- **"build the space based facilities out that can grow food
  infinitely"** → satellites got a compound line-shape (star12 bioreactor
  core + cross6 solar-array overlay) and a real, uncapped production
  counter (`FOOD_OUTPUT_KG_PER_WEEK = 40`, from `docs/SPACE_DELIVERY.md`'s
  own "tens of kg dehydrated protein per week per unit" baseline),
  displayed live in the click panel, computed from real wall-clock elapsed
  time (deliberately tiny numbers over a normal browsing session — that's
  the point, it's real-time not sim-accelerated).
- **"circling every 3-6 seconds, not NASA standard"** → satellite orbital
  period was still an arbitrary 20-32 *second* loop left over from before.
  Replaced with real Kepler's third law (`T = 2π√(r³/μ)`), altitude spread
  600-800km per the docs, giving real ~96.5-100.7 minute periods (sanity
  checked against ISS ≈ 92.7 min at 400km). Consequence: satellites now
  look nearly motionless over a normal session — correct, not broken.
- **"add more data... implement granularity... we do not use sprites for
  needs"** → biggest single change:
  - Extended `build_food_security_data.py` to also process admin1
    (state/province) rows. HDX's `admin1_code` turned out to use each
    country's own OCHA p-code scheme with no bundled/joinable boundary
    dataset, so the script now **fetches real admin1 polygons from
    geoBoundaries.org per country** and joins them to HDX region names by
    **normalized string match** (no shared ID space exists) — 509/816
    regions matched (~62%), rest logged as unmatched with reasons (many
    are FEWS NET livelihood zones/cultural sub-regions, not real
    administrative units, so they were never going to match by name).
  - The hand-authored 13-point illustrative "need" node/sprite concept
    (`kind: "need"`, `needLevel`) was **removed entirely** from
    `src/data/nodes.ts` — no more sprites for need at all, per explicit
    instruction. `DeliveryNode` simplified to hub-only. `routes.ts`
    (which used to target need-node IDs) changed to carry inline
    `toLat`/`toLng`/`toName` destination coordinates instead, so nothing
    broke.
  - Heatmap became two-layer: admin1 polygons render on top of country
    polygons (higher altitude, different border color), country fill as
    fallback wherever no admin1 match exists (4 countries — Burundi,
    Gambia, Tanzania, Uganda — matched zero admin1 regions and rely
    entirely on the country-level fallback).

## 6. Chromium crash, disk-space incident, and the eventual real fix

- User reported "Chrome is pegged at 100 percent - it cannot process it."
- Root-caused via `journalctl`: Chromium was actually **crash-looping**
  (SIGILL, "trap invalid opcode," identical instruction pointer both
  times — deterministic, not random OOM). Each crash triggered
  `systemd-coredump` to write a multi-gigabyte memory dump (one attempt:
  6.3GB peak), which is what was actually filling the disk to 0 bytes
  free mid-session — **not** anything the app itself writes (it's a pure
  client-side WebGL page, zero file I/O). Confirmed this is a separate
  concern from any "gigabytes of files" question the user asked — that
  was the OS crash reporter, not the app.
- Disk filled to 100% twice during this investigation; user fixed it
  externally (freed space) both times. One `Edit` call failed mid-flight
  with `ENOSPC` (verified afterward the file was untouched, not
  corrupted).
- First-round mitigations (didn't fully fix it): throttled the
  `pointermove` hover raycast to one pick per animation frame (was
  uncapped — 100+/sec raw mousemove events each triggering a full
  raycast against ~700 polygon meshes), capped `renderer.setPixelRatio`
  at 2, raised `polygonCapCurvatureResolution` to 20° (from default 5°),
  set `polygonsTransitionDuration` to 0. These reduced overhead but user
  reported it was **still frozen**.
- User asked "should we move some processing server side?" — agreed:
  the crash signature (deterministic SIGILL, likely a GPU driver crash
  from ~700 live `ConicPolygonGeometry` extruded meshes on an old 2012
  Intel HD 4000 GPU) needed the actual rendering path removed, not just
  tuned. **Real fix**: `build_food_security_data.py` now bakes the entire
  heatmap (country + admin1 fills, both boundary-line layers) into a
  single equirectangular PNG texture (4096x2048, ~0.2MB, via Pillow — new
  dependency) at build time, applied to the globe as one
  `globeMaterial.map`. `.polygonsData()` and all its accessors were
  removed from `main.ts` entirely — ~700 draw calls collapsed to 1.
  Click-to-inspect was redesigned to work without per-region meshes: on
  click, raycast the bare globe sphere for a surface point, convert to
  lat/lng via `globe.toGeoCoords()`, then resolve via a plain
  point-in-polygon test against the still-fetched (but no longer
  rendered) GeoJSON. Hover stays mesh-only/cheap on purpose — only clicks
  pay the point-in-polygon cost.
- **User confirmed: no longer crashing.**

## 7. Final commit

Committed and pushed everything from §5-6 in one commit
(`3d24d8b`, "Halt deliveries, real orbital physics, granular admin1
heatmap, fix Chromium crash") to `webdawg/4` on `main`.

## Current state / what a fresh session should know

- Dev server: `npm run dev`, pinned to port 60004.
- `SHOW_DELIVERIES = false` — no arcs/moving objects/rings/capsules/
  resupply beams currently visible. Satellites (orbital growing
  facilities) always render, real ~97-101 min orbital periods, real
  uncapped food-production counter.
- Heatmap is a **baked texture** (`public/data/heatmap_texture.png`), not
  live geometry — re-generate via `python3 scripts/build_food_security_data.py`
  (needs Pillow: `pip install pillow`) whenever the source CSV or country
  boundaries change.
- No more sprite markers for "need" — severity lives entirely in the
  heatmap texture + click-driven point-in-polygon lookup.
- Known open items (see SPEC.md for full detail): antimeridian-crossing
  countries (Russia, Fiji) have a rasterization artifact in the texture;
  admin1 match rate is ~62%, some countries (Burundi, Gambia, Tanzania,
  Uganda) have zero admin1 matches and fall back to country-level heat
  only; Cape Verde (CPV) has food-security data but no polygon at all
  (missing from the 110m country boundary set); the "mechanism inside
  each object" deep-design task mentioned early in the project is still
  only partially addressed (satellites got a production model, nothing
  else has).
- `SPEC.md` in the repo is the authoritative, much more detailed running
  log — read that first in any future session, this file is a summary.
