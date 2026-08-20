# Vision

## Premise

Model a global food delivery network unconstrained by conventional
logistics thinking. The guiding question: if cost were not the limiting
factor, what would it take to get food to anyone, anywhere, fast enough to
stop starvation? The simulation visualizes candidate delivery modalities
side by side so their reach, speed, and tradeoffs can be compared.

## Delivery modalities

| Mode | Concept | Tradeoff being visualized |
|---|---|---|
| Space | Orbital launch → atmospheric re-entry drop to a target zone | Fastest global reach, highest cost/complexity, precision-drop risk |
| Plane | Air hub → region, cargo flight or airdrop | Fast, moderate cost, needs airspace access |
| Ship | Port hub → coastal region, bulk freight | Cheapest per-ton, slowest, needs port access |
| Catapult | Extreme short-range ballistic launch | Last-mile / blockade-running scenarios, very limited range |
| Instructions | Broadcasting food-production knowledge instead of shipping goods | Zero physical logistics, but requires local capacity to act on it — a fundamentally different kind of "delivery" |

The mode list is intentionally open — `src/data/modes.ts` is the single
place new modalities get added, each with its own visual style (arc color,
altitude, animation speed) or, for non-physical modes, a different render
primitive entirely (pulsing rings instead of arcs).

## What this is not

- Not a real dispatch/logistics system — no live data, no real fleet or
  routing integration exists.
- Not a claim about real-world feasibility of any given mode (orbital food
  drops, catapults) — some entries are deliberately extreme, included to
  keep the design space wide rather than pre-filtered to "practical"
  options.
- The sample hub/need-region data in `src/data/nodes.ts` is illustrative,
  not sourced from a live humanitarian data feed.

## Roadmap (loose, not sequenced/committed)

1. **Now**: real hub/need-region dataset, all five modes active
   (ship/plane/catapult arcs, instructions rings, an orbital constellation
   + deorbit capsules for space per `docs/SPACE_DELIVERY.md`), and a
   click-to-inspect info panel covering every selectable thing on the
   globe — points, arcs, rings, moving objects, satellites, capsules,
   resupply beams.
2. **Next candidates** (unordered, pick based on what's actually
   interesting to build):
   - Time-based simulation (routes animate delivery over a simulated
     clock instead of a fixed loop)
   - Pluggable data source (swap sample data for a real public dataset,
     e.g. WFP/FEWS NET food-insecurity indicators, for the "need" side)
   - Capacity/throughput modeling per route (how much food, how often)
   - Cost/feasibility scoring per mode to make the "any cost" premise
     explicit and comparable rather than purely visual
   - Visual "impact" effect when a deorbit capsule lands, and a clearer
     in-flight vs. delivered state for capsules
   - **Micro-scale inventory**: extend the simulation down to
     progressively smaller objects — not just hub/region/vehicle scale,
     but down toward insect scale and below — each with the systems
     that regulate them and their own attributes (e.g. an insect is
     small and has eyes, and can see). Use the simulation itself as a
     way to inventory and define what exists at the micro level, the
     same way the macro (global hub/route) level is modeled today.
     Undefined beyond the idea itself — no data model or scale
     boundaries decided yet.
