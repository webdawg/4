# Dependencies

## Runtime requirements

- **Node.js** (tested with v26.5.0 — any current LTS should work)
- **npm** (tested with v12.0.1, bundled with Node)

## Project dependencies

Installed via `npm install`, defined in `package.json`:

| Package | Version | Purpose |
|---|---|---|
| `three` | ^0.185.1 | Core 3D rendering engine (WebGL) |
| `three-globe` | ^2.45.2 | Interactive 3D globe layer built on Three.js |

## Dev dependencies

| Package | Version | Purpose |
|---|---|---|
| `vite` | ^8.2.0 | Dev server + build tool |
| `typescript` | ~6.0.2 | Type checking / compilation |
| `@types/three` | ^0.185.4 | TypeScript type definitions for `three` |

## Setup

```bash
npm install
npm run dev      # starts Vite dev server (hot-reload) — open the printed local URL
npm run build    # type-checks (tsc) then produces a production build
npm run preview  # serves the production build locally
```

No environment variables, external services, or API keys are required — this
is a fully client-side static app once built.

## Data pipeline (optional, only needed to refresh the food-security heatmap)

- **Python 3**
- **[Pillow](https://pypi.org/project/pillow/)** (`pip install pillow`) —
  used to rasterize the heatmap texture (see below). Everything else in
  the script is standard library (`csv`, `json`, `pathlib`, `urllib`,
  `unicodedata`, `re`).
- **Network access** — fetches admin1 (state/province) boundary polygons
  from geoBoundaries.org on first run (see below). Not needed for the
  country-level data, which comes entirely from the committed source CSV.

```bash
python3 scripts/build_food_security_data.py
```

Reads `source_data/hdx_hapi_food_security_global.csv` (committed to the
repo for provenance/reproducibility — a HDX HAPI export, see
https://data.humdata.org/dataset/hdx-hapi-food-security) and
`public/data/ne_110m_admin_0_countries.geojson` (country boundaries,
already in the repo), and writes:

- `public/data/food_security_current.json` — country-level snapshot.
- `public/data/admin1_boundaries.geojson` — state/province boundary
  polygons, downloaded per-country from
  [geoBoundaries.org](https://www.geoboundaries.org/) (open license,
  CC BY 4.0 / Public Domain depending on country) and cached in
  `source_data/admin1_raw/` (gitignored — re-derivable, not committed) so
  re-runs don't re-fetch.
- `public/data/food_security_admin1.json` — admin1-level snapshot, joined
  to the boundary polygons by normalized region name (HDX and
  geoBoundaries don't share an ID scheme — see the script's docstring and
  SPEC.md for match-rate detail and why coverage isn't 100%).
- `public/data/heatmap_texture.png` — the country + admin1 heatmap **fill
  color only** (no boundary lines — a rasterized line blurs once
  texture-filtered onto a sphere), a single equirectangular raster image
  applied to the globe as a texture. This used to be rendered as ~700
  live 3D polygon meshes directly in the browser, which turned out to
  crash Chromium on at least one machine with older integrated graphics —
  see SPEC.md's "move heatmap rendering to a baked texture" update.
  Boundary lines are real vector geometry now (`addBoundaryLines()` in
  `src/main.ts`, plain `THREE.LineSegments`, not the mesh approach that
  crashed) built from the same GeoJSON this script outputs. The app also
  fetches that GeoJSON at runtime for click-to-inspect (a point-in-polygon
  lookup against the click coordinate) — see SPEC.md's "Heatmap rendering
  architecture" section for the full current-state picture.

Re-run whenever `source_data/hdx_hapi_food_security_global.csv` is
refreshed with a newer HDX export. Safe to re-run at any time — boundary
downloads are cached, so a re-run without a cache clear only re-processes
the CSV and re-bakes the texture (a few seconds).
