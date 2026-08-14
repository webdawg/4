# Expansion Modes — Shallow Pass

Five additions requested and implemented in one fast pass, **deliberately
shallow** — enough attributes to run in the simulation now, not yet given
the "decision, not a survey" full design-doc treatment `SPACE_DELIVERY.md`,
`OCEAN_FARM.md`, `AUTONOMOUS_TRANSPORT.md`, and `DRONE_DELIVERY.md` each
got. Revisit each of these with that same depth later; this document is
the placeholder that says what's committed so far and what isn't.

**Speed convention used throughout**: every speed figure below is a naive
real-world estimate **derated 10-20%**, per explicit instruction — read
the numbers as intentionally conservative, not miscalculated.

## Autonomous Electric Submarine (`submarine` mode)

- **Role: all of it** — a general-purpose underwater cargo mode, not
  narrowly scoped to one use case. Storm/interdiction-resilient
  alternative to surface shipping, ocean-farm-to-surface logistics, and
  long-haul bulk transport all apply.
- Cruise speed: ~6.8 knots (naive estimate ~8 knots, derated).
- Renders below the surface (`altitude: -0.05`, the only physical mode
  with a negative arc altitude) — everything else in this simulation
  arcs above the globe; this is the one exception, by design.
- **Not yet designed**: hull class/tonnage, power source (battery-only?
  same solar-hydrogen hybrid as the surface fleet, charged while
  surfaced?), depth rating, autonomy/failure handling, per-unit specs.

## Autonomous Electric Train (`train` mode)

- **Dual-mode**: runs the existing rail network, then lowers a secondary
  drive system to continue a short distance off-track when the
  destination isn't rail-connected — one vehicle, two drive modes, not a
  cargo-pod-transfer design.
- Speed: ~59.5 km/h (naive estimate ~70 km/h, derated).
- **Not yet designed**: off-track range/terrain limits, the actual
  secondary drive mechanism, car/consist configuration, power source,
  autonomy/failure handling, per-unit specs.

## Human Porter (`porter` mode)

- **Its own delivery mode**, not an attribute tacked onto other routes —
  same pattern as every other mode: origin, destination, arc, moving
  object.
- "People are part of the delivery network" — the mode exists
  specifically for terrain/precision nothing else in this system reaches
  (see the example route: a remote valley beyond even the drone's
  parachute-drop precision, served from the same forward station).
- Speed: ~3.4 km/h loaded walking pace (naive estimate ~4 km/h, derated)
  — deliberately the slowest mode in the system, by design.
- **Not yet designed**: literally everything beyond speed — this is the
  shallowest of the five. Who, how compensated/supported, safety,
  capacity per person, anything.

## Secure Mesh Network (comms layer)

- **Data-level only, not rendered** — every hub, drone station, and
  satellite's info panel now shows a "Comms: Secure encrypted P2P mesh,
  wireless + wired" row (`MESH_COMMS_NOTE` in `src/main.ts`). No new
  lines or geometry were added to the globe for this — explicitly
  decided against, given the ~700-mesh Chromium crash earlier this same
  session. A visible mesh-overlay layer is a real option later, but
  needs real thought about how many connections actually get drawn
  before it's worth the rendering risk.
- **Not yet designed**: literally any of the actual networking substance
  — this is a description on a label right now, not a modeled system.

## Verification Ledger

- A **real, working, local hash-chained ledger** (not shallow in the same
  way as the three modes above — this one got an actual mechanism):
  `src/main.ts`'s `ledger` array, each entry `{ index, timestampMs,
  routeId, detail, previousHash, hash }`, hash computed via
  `crypto.subtle.digest("SHA-256", ...)` (Web Crypto, real cryptographic
  hashing, not a placeholder function) chained to the previous entry's
  hash.
- Every 45 seconds (`LEDGER_VERIFICATION_INTERVAL_MS`), a random route
  from the full route list gets "verified" and appended to the chain —
  independent of `SHOW_DELIVERIES`, since verification is a
  network-integrity concern, not a visual-motion one.
- `submitToBlockchain(entry)` is the explicit, named integration point
  for "eventually posted to a p2p blockchain api" — right now it only
  `console.log`s. Deliberately not wired to any live network:
  actually posting to a real external service is a consequential action
  this simulation shouldn't take on its own without being asked to.
- No UI yet — inspect the running chain via `window.__ledger` in the
  browser console. A real panel is a reasonable next step once there's
  something worth looking at beyond the raw array.

## Where the "shallow" line was drawn

Speed and enough identity (label, color, shape, one-line description) to
render and click on. Not drawn: subsystems tables, autonomy/failure
handling, per-unit spec tables, siting logic — the kind of depth the
first four docs each have a full section for. Come back to each of these
five with that same treatment when it's time to flesh out the science.
