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
orbital automated growing/delivery subsystem design,
[`docs/OCEAN_FARM.md`](docs/OCEAN_FARM.md) for the floating ocean farm
(plant-based aquaculture + solar + microplastic filtration) subsystem,
[`docs/AUTONOMOUS_TRANSPORT.md`](docs/AUTONOMOUS_TRANSPORT.md) for the
autonomous solar-electric cargo fleet behind the "ship" delivery mode,
[`docs/DRONE_DELIVERY.md`](docs/DRONE_DELIVERY.md) for the autonomous
electric drone last-mile network, [`docs/EXPANSION_MODES.md`](docs/EXPANSION_MODES.md)
for the shallow-pass additions (autonomous submarine/train, human
porters, mesh comms, the verification ledger), and
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

The globe renders a real hub network — sea ports, air cargo hubs, orbital
launch sites, UN humanitarian depot locations (WFP's UNHRD network),
floating ocean farms at real coastal upwelling zones, and drone
launch/charging stations — plus a food-security heatmap (country and
admin1/district granularity) built from real HDX HAPI data, not
illustrative points.

Deliveries are **active** (`SHOW_DELIVERIES = true` in `src/main.ts` —
flip to `false` to go back to a bare hub-network globe) across eight
physical modes: ship, plane, catapult, drone, submarine, train, and
porter all render as a plain glowing dot traveling from origin to
destination (no arc line drawn — the dot's own curve conveys the mode's
altitude); "space" is its own subsystem, an orbiting satellite
constellation that periodically launches deorbit capsules (also a dot)
toward target regions; "instructions" (knowledge-broadcast) renders as
pulsing rings. See `docs/SPACE_DELIVERY.md`, `docs/OCEAN_FARM.md`,
`docs/AUTONOMOUS_TRANSPORT.md`, `docs/DRONE_DELIVERY.md`, and
`docs/EXPANSION_MODES.md` for what's behind each mode.

Everything on the globe is **selectable** — click any hub, drone station,
ring, moving shipment, orbital satellite, deorbit capsule, resupply beam,
country, admin1 region, or starvation zone to open an info panel with
detail about it. Click empty space, or the panel's close button, to
dismiss it.

See `SPEC.md` for full implementation detail.

## License

[GNU Affero General Public License v3.0 (or later)](LICENSE).
