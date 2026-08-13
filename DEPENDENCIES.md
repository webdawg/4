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

- **Python 3** (standard library only — `csv`, `json`, `pathlib` — no pip
  packages required)

```bash
python3 scripts/build_food_security_data.py
```

Reads `source_data/hdx_hapi_food_security_global.csv` (committed to the
repo for provenance/reproducibility — a HDX HAPI export, see
https://data.humdata.org/dataset/hdx-hapi-food-security) and writes
`public/data/food_security_current.json`, which the app fetches at runtime.
Only needs to be re-run when the source CSV is refreshed with a newer HDX
export.
