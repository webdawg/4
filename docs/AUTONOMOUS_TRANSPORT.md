# Autonomous Solar Transport Fleet

An autonomous, solar-electric cargo vessel fleet forming the connective
logistics layer between every hub already in this simulation — sea ports,
ocean farms, humanitarian depots — and every inhabited continent. This is
the concrete physical system behind the existing **ship** delivery mode,
which until now has been a generic arc with no described vehicle, the
same relationship `docs/SPACE_DELIVERY.md` has to the "space" mode.

## Why autonomous, why solar

1. **No crew means no crew limits.** No rest-hour regulations, no
   habitability constraints, no risk to human life on a slow, low-power
   voyage — this is what makes a *slower* ship (see the propulsion
   section below — this is not a fast fleet) an acceptable tradeoff
   instead of a fatal one. A crewed ship this slow would be
   uneconomical; an autonomous one just takes longer to arrive.
2. **No fuel purchase, no emissions, no fuel-price exposure.** Every
   other delivery mode in this system either has a real physical energy
   cost already priced in (rocket fuel, jet fuel) or is small-scale
   enough not to matter (catapult). A global cargo fleet is exactly the
   scale where fuel cost and emissions are not a rounding error — solar
   removes both.
3. **The hub network this fleet connects already exists and already
   spans the ocean-facing world** — sea ports, ocean farms, and coastal
   depots are all coastal or ocean-based by construction. A maritime
   fleet is the natural connective tissue between them, not a new kind
   of infrastructure grafted on.

## Propulsion technology: the decision, not a survey

**Hybrid solar-electric with hydrogen fuel-cell buffering, not pure
solar.** Stated plainly because it matters: a deck-mounted solar array
cannot generate enough continuous power to propel a cargo-scale vessel
at cargo-ship speeds — this is a real physics constraint, not a detail
to wave away. The design that actually works:

- A retractable rigid solar array across the deck/superstructure, sized
  to the vessel (see spec table) — generates power whenever the sun is
  up, full stop.
- Surplus solar output (whenever generation exceeds immediate propulsion
  need — in port, at anchor, at reduced speed, or simply during peak
  daylight) runs an onboard electrolyzer, splitting seawater-derived
  fresh water into hydrogen, stored in onboard tanks.
- Hydrogen fuel cells supply propulsion power at night, in poor weather,
  and whenever demand exceeds instantaneous solar output — the buffer
  that makes 24/7 operation possible without ever burning fossil fuel.
- **The real cost of this honesty is cruising speed**: ~10-12 knots,
  not the ~18-22 knots a conventional fossil-fueled cargo ship runs.
  Autonomous crewless operation is exactly what makes that acceptable —
  see reason 1 above.

This is not speculative — solar-hydrogen hybrid marine propulsion
already exists in demonstrator form today (e.g. *Energy Observer*); the
gap this design has to close is scaling it to real cargo tonnage, not
inventing the concept.

## Fleet architecture

- **Vessel class: ~3,000-4,000 dwt**, deliberately smaller than a
  standard container-ship "Handysize" class. Two reasons, not one:
  solar-hydrogen power density genuinely doesn't support a larger hull
  at useful speed yet, and smaller draft means direct access to the
  shallower, less-developed ports many need-regions actually have,
  rather than requiring deep-water container infrastructure most of
  them don't.
- **Hub-and-spoke network**, not point-to-point — vessels run fixed
  corridors between hub clusters (e.g. West African ports ↔ European
  ports, or ocean-farm pickup ↔ nearest depot) rather than one-off
  routes per need-region, the same logistics principle real shipping
  networks already use.
- **Every inhabited continent, with one honest gap**: existing hub
  coverage already spans Europe, Asia, North America, South America, and
  Africa (see `src/data/nodes.ts`). **Australia/Oceania has zero hubs of
  any type in the current data** — this fleet's coverage claim is not
  yet complete until at least one Pacific/Australian hub exists.
  Flagged here explicitly rather than glossed over; adding that hub is
  a near-term follow-up, not a detail this document should pretend is
  already solved.

## Subsystems every vessel needs

| Subsystem | Function | Design notes |
|---|---|---|
| Retractable solar array | Primary power generation | Retracts/reorients in high wind or storm conditions — same wave/wind survivability logic as the ocean farms' floating solar |
| Electrolyzer + hydrogen storage | Converts surplus solar to storable chemical energy | The buffer that makes night/weather-independent operation possible |
| Fuel cell stack | Converts stored hydrogen back to propulsion power on demand | Consumable stack life, not a one-time install — see maintenance below |
| Electric propulsion (azimuth thrusters) | Propulsion + maneuvering | Electric drive is a natural fit for a solar-hydrogen power source — no separate mechanical drivetrain to also solar-power |
| Autonomous navigation | COLREGS-compliant collision avoidance, route-following, port approach/docking | Same class of problem as autonomous cars, at lower traffic density but higher stakes per incident |
| Remote monitoring + override | Human-in-the-loop fallback, not full unsupervised autonomy | Same "fails safe, holds position" philosophy as every other autonomous subsystem in this simulation |
| Cargo hold | The actual freight capacity | Sized to vessel class, no special requirements beyond standard dry/refrigerated hold split |

## What must be maintained, and why

- **Hull biofouling cleaning** — same drag/efficiency concern as the
  ocean farms' longline fouling, different surface.
- **Solar panel cleaning** — salt spray fouling, same as every other
  marine solar surface in this system.
- **Fuel cell stack replacement** — a wear component with a finite
  operating-hours life, not a permanent install.
- **Periodic drydock structural inspection** — standard maritime
  practice, unrelated to the autonomous/solar systems specifically.
- **Battery buffer replacement** — smooths the gap between
  instantaneous solar/fuel-cell output and propulsion demand; degrades
  with charge cycles like any battery.

## Autonomy and failure handling

- **Navigation system uncertainty (heavy traffic, poor visibility, sensor
  disagreement)** → reduce speed and hold position rather than proceed
  on low-confidence perception — same "abort rather than act on
  uncertainty" principle as the orbital platforms' deorbit guidance
  fail-safe.
- **Storm warning** → retract/stow solar array, reduce speed or divert
  around the system, same as any real vessel — autonomy doesn't remove
  the need to respect weather, it just removes the crew-safety stakes of
  doing so imperfectly.
- **Hydrogen system fault (leak detection, electrolyzer fault)** →
  isolate the affected subsystem, fall back to battery-only reserve
  power, proceed at reduced speed to the nearest hub rather than
  continue the full route — fail toward the nearest safe hub, not
  toward completing the original plan.
- **Comms loss** → hold current course/speed on last known-good routing,
  do not attempt autonomous rerouting without a connection, same
  "default to hold, not act" philosophy used everywhere else in this
  system.
- **Power fault** → shed non-essential loads (cargo refrigeration
  first if dry cargo, hotel loads) before propulsion and navigation.

## Per-vessel specification (planning baseline)

| Parameter | Value |
|---|---|
| Vessel class | ~3,000-4,000 dwt |
| Cruising speed | ~10-12 knots |
| Propulsion | Solar-electric with hydrogen fuel-cell buffering |
| Power source | Retractable deck solar array + electrolyzer + hydrogen storage + fuel cell stack |
| Crew | None — fully autonomous, remote-monitored |
| Route model | Hub-and-spoke fixed corridors, not point-to-point |
| Continental coverage | Europe, Asia, North America, South America, Africa (existing hubs) — Australia/Oceania not yet covered, see above |
| Design lifetime | ~25-30 years (hull), fuel cell stack and battery buffer replaced on separate, shorter cycles |
| Dominant cost driver | Power density at cargo scale — the same category of constraint as the orbital platforms' cost-per-kg-to-LEO and the ocean farms' mooring engineering: the one line item that decides whether this is viable at real scale |

## Where this fits in the existing system

This is the concrete vehicle design behind the existing **ship** delivery
mode (`src/data/modes.ts`) — until now an abstract arc with a color and a
speed, no described vehicle, same gap `docs/SPACE_DELIVERY.md` closed for
the "space" mode. It's also the pickup mechanism `docs/OCEAN_FARM.md`
already assumed without designing ("ship-mode routes can originate from
it exactly like the existing sea-port hubs") — this document is that
assumption made concrete. No new delivery mode or route mechanic is
needed in the simulation's data model; this describes *what a ship-mode
route actually is* now, the same way the orbital constellation describes
what a space-mode route actually is.
