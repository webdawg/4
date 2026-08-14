# Autonomous Electric Drone Delivery

The last-mile layer: a network of small, autonomous, solar-charged
electric fixed-wing drones and their launch/charging stations, closing
the gap every other delivery mode in this system leaves open. Ships,
planes, orbital capsules, and the autonomous cargo fleet all move bulk
food *to* a hub. This is what moves it from a hub — or a forward station
with no hub at all — *to a specific person*, including where no other
mode can physically or politically reach.

## Why this layer has to exist

Every other mode in this system delivers to a coordinate a large vehicle
can reach: a coastline, an airfield, an orbital-drop target zone. Real
famine and food insecurity frequently concentrate in exactly the places
those large vehicles cannot reach — contested interior territory,
destroyed infrastructure, and **closed or blockaded borders that have
nothing to do with whether people inside them are starving.** This
system's mission (`docs/VISION.md`) was never "deliver where politically
convenient" — it's "what would it take to get food to anyone, anywhere."
A small autonomous aircraft that doesn't need a runway, a port, or
permission is the only mode in this system actually built for that case.
Concretely, and without euphemism: this includes flying food into
places like North Korea, a country with a well-documented history of
severe, UN-reported famine and food insecurity, and no realistic prospect
of consenting to any of this system's other delivery modes crossing its
border. The design does not treat political access as a constraint on
who deserves to eat.

## Vehicle technology: the decision, not a survey

**Small fixed-wing electric aircraft, not multicopter.** Real-world
precedent already operates at meaningful scale today — Zipline's medical
and food delivery drones have flown hundreds of thousands of real flights
in Rwanda, Ghana, and elsewhere — this is not speculative technology, it
already exists at the "national health system" scale. This design
extrapolates from that, honestly:

- Fixed-wing beats multicopter on the one metric that matters for range:
  lift-to-power efficiency. A multicopter hovers on brute thrust the
  entire flight; a fixed wing generates most of its lift for free from
  forward airspeed. At this mission's range requirements, multicopter
  electric flight time doesn't come close.
- **Battery energy density is the real, unmovable constraint** — stated
  plainly, the same way this system states its other hard physical
  limits (orbital cost-per-kg, cargo-ship solar power density). No
  battery chemistry available or near-term makes a heavy-payload,
  long-range electric aircraft physically possible today. The numbers
  below (8 kg payload, 120 km one-way) are chosen to sit at the edge of
  what's real and flying today, not past it.
- **Delivery is a drop, not a landing**, for the same reason Zipline's
  real system drops rather than lands: landing requires a secured,
  known-safe surface and a way to get airborne again. A precision
  parachute drop from altitude needs neither — critical specifically for
  the contested/insecure-territory case this whole mode exists for.

## Drone station network

- **Small, numerous, forward-deployed** — unlike the major hubs
  (ports, ocean farms, depots), stations are lightweight infrastructure:
  a small power system, a battery buffer, a launch rail, and a charging
  dock. Cheap enough to place many, specifically so coverage can extend
  past where the major hubs already reach.
- **Hybrid clean power, not solar-only** — matching every other power
  source in this system (orbital solar, ocean farm floating solar, the
  autonomous cargo fleet's solar-hydrogen hybrid), but a station is
  small and stationary in a way a satellite or a ship isn't, so it isn't
  locked into one generation technology: **solar array as the primary
  source, plus a small wind turbine** sized to the specific site — no
  fuel logistics for a station that may sit in contested or
  hard-to-resupply territory, and the wind turbine specifically closes
  solar's night/low-sun gap, which matters more here than it does for
  the orbital platforms (continuous sun, no night to cover) or the
  ships (which have hydrogen buffering instead). A coastal or offshore
  station (like the Yellow Sea station below) is exactly the kind of
  site real small wind turbines already perform well at — this isn't a
  token gesture at "clean tech diversity," it's the actual right
  engineering choice for this specific site type.
- **~50 kW solar array + ~10 kW wind turbine per station**, battery
  buffer sized for ~20 drone charge-and-launch cycles per day.
- **Station spacing driven directly by drone range**: at 120 km one-way,
  stations need to sit within roughly that distance of the population
  they serve — this is not a network that can have sparse, widely-spaced
  nodes the way sea ports do. Coverage is built by placing stations
  close to where they're needed, not by routing long distances from
  existing major hubs.
- Stations do not require a hub of any other type nearby. They can stand
  alone, specifically so a station can be positioned to serve an
  otherwise-unreachable population without depending on port/air/depot
  infrastructure that may not exist or be accessible there.

## Subsystems every station needs

| Subsystem | Function | Design notes |
|---|---|---|
| Solar array + wind turbine + battery buffer | Power for charging and launch | ~50 kW solar + ~10 kW wind, ~20 cycles/day buffer capacity — wind covers the night/low-sun gap solar alone leaves |
| Launch rail / recovery net | Get the drone airborne without a runway, recover it without a landing strip | Same catapult-launch/net-recovery approach real fixed-wing delivery drones already use |
| Autonomy computer + comms | Mission planning, in-flight monitoring | Must operate in denied/jammed environments — see autonomy section |
| Payload loading | Load and seal the food payload before launch | Dehydrated/stabilized product, same "never transport water" principle as the rest of this system |
| Parachute drop mechanism (on the drone itself) | Release the payload at the target coordinate from altitude | No landing required at the delivery point |

## Autonomy and failure handling — written for contested airspace, not just weather

This is the one delivery mode in the system explicitly designed to
operate where it may not be welcome, so its failure modes are different
in kind from the others, not just degree:

- **GPS-denied or jammed navigation** → falls back to inertial navigation
  plus terrain-relative visual matching against a pre-loaded map —
  degrades accuracy, does not abort the mission. A system that gives up
  the moment it enters contested airspace isn't a system that can do
  what this mode exists to do.
- **Comms lost (jammed or simply out of range)** → continues the
  pre-programmed mission profile autonomously rather than loitering or
  returning — this mode cannot assume a link will be available at the
  moment it matters most.
- **Off-course beyond recoverable tolerance, or unrecoverable fault** →
  controlled soft-crash into open terrain along the planned route, away
  from any populated area the aircraft can detect, rather than an
  uncontrolled failure — the aircraft is small and unarmed, but a
  crashing aircraft is still a crashing aircraft, and this failure mode
  is treated with the seriousness that implies.
- **Successful drop, recovery not possible (station unreachable, aircraft
  damaged)** → aircraft is treated as expendable in this case, by
  design, not written off as an oversight — cost-per-unit is engineered
  low enough (see spec table) that occasional loss is an acceptable
  operating cost for reaching somewhere nothing else can.

## Per-unit specification (planning baseline)

| Parameter | Value |
|---|---|
| Airframe | Small fixed-wing, electric |
| Payload | ~8 kg |
| Range | ~120 km one-way (parachute drop, no return-with-payload requirement) |
| Cruise speed | ~110 km/h |
| Launch method | Rail launch, no runway required |
| Recovery method | Net recovery at station, or expendable if recovery isn't possible |
| Delivery method | Precision parachute drop from altitude — no landing at the delivery point |
| Station power | ~50 kW solar + ~10 kW wind, ~20 charge/launch cycles/day battery buffer |
| Navigation | GPS-primary, inertial + terrain-relative fallback for denied/jammed environments |
| Dominant cost driver | Battery energy density — same category of hard physical constraint as the orbital platforms' cost-per-kg-to-LEO and the transport fleet's solar power density at cargo scale |

## Where this fits in the existing system

A new delivery mode (`"drone"`, alongside the existing space/plane/ship/
catapult/instructions) and a new object class for stations — not a hub
type in `nodes.ts`, deliberately: stations are lightweight,
numerous, and frequently *not* co-located with a major hub, the same
architectural reason satellites aren't hubs either. Routes are short
(station-to-need, tens of km, not the ocean-spanning distances every
other physical mode covers) because the vehicle physics genuinely don't
support anything longer. This is the connective layer that makes
"everything is connected" true in practice — every other mode gets food
to a hub or a broad target zone; this is what closes the last gap to a
specific, otherwise-unreachable place.
