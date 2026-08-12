# Food Relief Network

A 3D, browser-viewable simulation of a global food delivery network —
exploring every delivery modality on the table to visualize what it would
take to end starvation: sea, air, orbital drop, extreme short-range
("catapult"), and non-physical delivery of food-production knowledge.

This is a **visualization/simulation project**, not real-world logistics
infrastructure. See [`docs/VISION.md`](docs/VISION.md) for the product
concept, [`docs/GLOBAL_FOOD_SYSTEM.md`](docs/GLOBAL_FOOD_SYSTEM.md) for the
full strategic design (production layers, technology tradeoffs, phased
rollout), [`docs/SPACE_DELIVERY.md`](docs/SPACE_DELIVERY.md) for the
orbital automated growing/delivery subsystem design, and
[`SPEC.md`](SPEC.md) for build history and decisions.

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

The globe now renders a real hub network — actual sea ports, air cargo
hubs, orbital launch sites, and UN humanitarian depot locations (WFP's
UNHRD network), alongside a set of widely-reported food-insecure regions.
Node/hub coordinates are real; need-region severity levels are illustrative
approximations, not sourced from a live feed. Distribution routes (arcs,
moving delivery objects, knowledge-broadcast rings) exist in the code but
are currently toggled off — see `SHOW_DISTRIBUTION_ROUTES` in
`src/main.ts` and `SPEC.md`.
