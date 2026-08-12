# Orbital Automated Food Production & Delivery

Autonomous, solar-powered platforms in orbit that grow concentrated
nutrition in closed-loop bioreactors and periodically deorbit small guided
capsules of food to designated surface coordinates. This is the physical
system behind the "space" hub type and delivery mode already defined in
`src/data/nodes.ts` and `src/data/modes.ts`.

## Why orbit

Cost per kilogram to orbit and back will not compete with a field of
potatoes for a long time — this is not a replacement for Layer 1/2
terrestrial production. Its advantage is narrow, real, and worth building
for three specific reasons:

1. **It converts free, continuous solar energy into food mass while
   importing only nutrient and water top-ups, not the bulk output mass.**
   Biological culture is mostly water and light-fixed carbon synthesized
   in place — you launch the hardware and the trace nutrients once, then
   the sun does the rest of the mass-building for free, indefinitely.
2. **It's a reserve no terrestrial blockade, war, drought, or port closure
   can touch.** Orbital mechanics don't answer to ground politics.
3. **It's the direct precursor technology for Moon/Mars food production**
   — same closed-loop bioreactor, same automation stack, same
   nutrient-recycling problem, transferable with no redesign.

A fourth, smaller use case: guided reentry can reach a GPS coordinate that
no truck, plane, or drone currently in range can — genuinely inaccessible
drop zones (destroyed runways, contested interior territory). Real, but
niche — it does not replace the other four delivery modes for routine use.

## Growing technology: the decision, not a survey

**Photobioreactor spirulina/algae culture plus precision gas fermentation
microbial protein.** Not field crops, not soil-based hydroponics for
staples. Reasoning:

- Zero soil mass to launch.
- Algae/spirulina culture is >90% water, closed-loop recirculated — only
  trace nutrient salts need replenishing, not bulk growing medium.
- Spirulina delivers a complete, dense protein profile (60-70% dry weight)
  plus B12 analog, iron, and micronutrients no single terrestrial staple
  matches on its own.
- Gas-fed microbial protein (hydrogen-oxidizing or methanotrophic
  bacteria) eats the CO2/H2 already present in the closed-loop
  life-support gas balance — it recycles a stream that has to be
  scrubbed anyway, rather than requiring a separate feedstock launch.
- Photosynthetic microalgae double as the O2 source and CO2 sink for the
  platform's own life-support loop — the crop and the atmosphere system
  are the same subsystem. This halves the hardware that has to be
  launched compared to growing food and running life support separately.
- A small supplementary hydroponic tray of leafy greens (flight-proven on
  ISS via the Veggie and Advanced Plant Habitat experiments) closes the
  micronutrient-diversity gap algae alone doesn't cover — vitamin C,
  folate, and palatability — at low incremental mass.

Field-crop staples, full vegetable CEA, and livestock are rejected for
this application: all require more mass, water, and volume per calorie
than orbital algae/fermentation, and none double as life-support hardware.

## Orbital architecture

- **Orbit: dawn-dusk sun-synchronous LEO, ~600-800 km.** This orbit tracks
  the day/night terminator, keeping the platform in continuous sunlight
  essentially year-round — no eclipse, so no battery mass is needed for
  power continuity, unlike a standard LEO orbit's ~35-minute eclipse every
  ~90 minutes.
- **A constellation of many small/medium units, not one large station.** A
  single platform is a single point of failure and a single
  reentry-targeting bottleneck. A constellation gives redundancy, more
  frequent overpasses of any given drop zone, and lets one failed unit be
  deorbited and replaced without losing total system capacity.
- **Unit class: comparable to a large modern communications satellite**,
  on the order of 2,000-6,000 kg wet mass — large enough for a meaningful
  bioreactor volume and solar array, small enough to launch on a single
  medium-lift vehicle, and small enough that fleet economics (many units)
  beat single-large-asset economics for a system that needs redundancy.

## Subsystems every unit needs

| Subsystem | Function | Design notes |
|---|---|---|
| Solar array | Power for pumps, avionics, thermal control, comms | Sized for continuous sun-sync illumination; battery mass minimized to short-duration reserve only |
| Photobioreactor / fermenter vessels | The growing volume itself | Sealed, recirculating, actively pump-mixed — microgravity means no convection, so mixing is mandatory hardware, not passive |
| Thermal control | Reject waste heat to space | Vacuum has no convective cooling — radiator panels sized to bioreactor + electronics heat load |
| Water/nutrient loop | Recycle water and N-P-K/trace nutrients between harvests | Not fully closed — every harvested/deorbited capsule removes biomass, and the nutrients/water bound in it, from the loop |
| Radiation shielding | Protect the culture and electronics from ionizing radiation | LEO shielding load is moderate, not zero — culture viability is monitored and periodically reseeded from a shielded inoculum reserve |
| Attitude control / station-keeping propulsion | Maintain orbit, solar pointing, comms pointing, deorbit targeting | Electric (ion/Hall) propulsion for efficient station-keeping; a separate solid or hypergolic stage for the deorbit burn itself |
| Autonomy computer + comms | Run the grow/harvest/package/deorbit cycle without a crew; report status, accept ground override | Fails safe: default on comms loss is hold current state, never deorbit blind |
| Harvest + packaging robotics | Dewater/concentrate biomass, stabilize it, load it into a capsule | The hardest unsolved piece — dewatering and packaging in microgravity without a crew is not yet flight-proven at this scale. Top R&D risk, not an assumed-solved detail |
| Deorbit capsule bay | Houses and releases reentry capsules on command | Each unit carries several capsules between resupply visits so one drop doesn't ground it |

## The delivery capsule

- **Payload: dehydrated, concentrated spirulina and microbial-protein
  product** — dehydration happens on-orbit before packaging, for the same
  "never transport water" principle used everywhere else in this system,
  doubly true when the transport medium is atmospheric reentry heating.
- Small, tens-of-kilograms payload class (not a crewed-vehicle-scale
  return capsule). Ablative or PICA-type heat shield. GPS-guided steerable
  parafoil for terminal accuracy — the same technology category already
  flight-proven by cargo-return capsules (Dragon, Progress) and guided
  cargo airdrop systems (JPADS), scaled down and adapted for autonomous
  reentry.
- **Targeting is the same lat/lng coordinates already defined for `need`
  nodes** in the simulation's data model. No new targeting concept — it's
  the same coordinate the "space" arcs already terminate at.
- Landing accuracy and post-landing payload-integrity verification both
  need pilot validation before this is trusted for real deliveries — a
  "Test Everything" item, not an assumed-solved detail.

## What must be resupplied from Earth, and why

The loop is not fully closed. What leaves and must be replaced:

- **Nutrient salts** (N-P-K + trace minerals) bound into harvested and
  deorbited biomass, not returned to the loop.
- **Water**, similarly bound into deorbited biomass — though on-orbit
  dehydration before packaging returns most water to the platform's own
  loop rather than deorbiting it, so this loss is small relative to the
  calorie/protein value delivered.
- **Inoculum/seed culture**, periodically, to refresh genetic diversity and
  replace culture lost to radiation damage or contamination.
- **Propellant** for station-keeping and deorbit burns.
- **Spare parts** for pumps and actuators robotics can swap but not
  manufacture.
- **Capsules**: heat shields and parafoils are consumables, one per drop.

Resupply launches from the same orbital hub sites already in the
simulation's data — `hub-kourou`, `hub-baikonur`, `hub-kennedy`,
`hub-jiuquan`, `hub-sriharikota` — on a cadence set by whichever
consumable runs out first. Nutrient/water top-up is typically the limiting
one, since it scales with how much food the unit has actually shipped out,
not with a fixed calendar interval.

## Autonomy and failure handling

Unmanned means every failure mode needs a pre-defined automated response,
not a human troubleshooting it live:

- **Culture contamination or crash** → isolate the affected vessel, switch
  to a backup culture line, flag for reseed at next resupply.
- **Comms loss** → hold last safe state; no deorbit, no maneuvering beyond
  station-keeping.
- **Power fault** → shed non-essential loads (harvesting/packaging first),
  preserve thermal control and attitude control last.
- **Deorbit guidance uncertainty** → abort the drop, hold the capsule,
  rather than release on a low-confidence trajectory.
- **End of life** → controlled deorbit of the entire platform, standard
  satellite disposal practice, not left as debris.

## Per-unit specification (planning baseline)

| Parameter | Value |
|---|---|
| Orbit | Dawn-dusk sun-synchronous LEO, ~600-800 km |
| Wet mass at launch | 2,000-6,000 kg |
| Solar array power | Several kW continuous, no eclipse |
| Bioreactor/fermenter volume | Multiple m³, sealed and recirculating |
| Food output | Tens of kg dehydrated protein product per week per unit — baseline for pilot testing, not a delivered fact |
| Capsules carried between resupply | Single digits to low tens |
| Capsule payload mass | Tens of kg dehydrated product each |
| Resupply cadence | Months, set by nutrient/water consumption rate |
| Design lifetime | 5-10 years, comparable to similar-class satellites |
| Dominant cost driver | Cost per kg to LEO — falling with reusable launch vehicles, and the single line item that decides whether this system is worth building at all |

## Where this fits in the existing system

The five space hub nodes already in `src/data/nodes.ts` are dual-purpose
under this design: they're both the launch sites that deploy new orbital
growing units and the resupply sites that keep existing ones running. The
"space" arcs in the (currently toggled-off) route model represent the
deorbit-capsule drops from orbit straight to `need` node coordinates —
no new data model is required to represent this, the existing "space"
mode already is this.
