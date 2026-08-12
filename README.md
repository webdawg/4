# Food Relief Network

A 3D, browser-viewable simulation of a global food delivery network —
exploring every delivery modality on the table to visualize what it would
take to end starvation: sea, air, orbital drop, extreme short-range
("catapult"), and non-physical delivery of food-production knowledge.

This is a **visualization/simulation project**, not real-world logistics
infrastructure. See [`docs/VISION.md`](docs/VISION.md) for the full concept
and [`SPEC.md`](SPEC.md) for build history and decisions.

## Stack

- [Vite](https://vitejs.dev/) + TypeScript
- [Three.js](https://threejs.org/) + [three-globe](https://github.com/vasturiano/three-globe) for the interactive 3D globe

## Running locally

```bash
npm install
npm run dev
```

Then open the printed local URL in a browser.

## Project structure

```
src/
  data/
    modes.ts    delivery modality definitions + visual style per mode
    nodes.ts    sample hub/need-region data (lat/lng)
    routes.ts   sample delivery routes tagged by mode
  main.ts       scene setup: globe, camera, controls, render loop
```

Delivery modes are defined once in `src/data/modes.ts` and are meant to be
extended — the mission is deliberately open-ended about *how* food gets
delivered.

## Status

Early scaffold: a sample dataset of hubs, need-regions, and routes across
all five delivery modes rendered on an interactive globe. Not connected to
any live data source.
