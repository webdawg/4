# Floating Ocean Farms

Large moored offshore platforms combining plant-based longline seaweed
aquaculture, floating solar power, and passive microplastic filtration.
This is the physical system behind a new "ocean farm" hub type, sited in
the simulation alongside the existing sea ports, air cargo hubs, orbital
launch sites, and humanitarian depots.

## Why ocean

Land is the scarce input every terrestrial food system competes for —
arable soil, fresh water, growing season. The open ocean has none of
those constraints and covers 70% of the planet, nearly all of it
completely unused for food production today. Three specific advantages,
not a general "the ocean is big" argument:

1. **The crop needs no feed, fertilizer, or soil input at all.** Seaweed
   absorbs dissolved nutrients directly from the surrounding seawater —
   there's no feedstock to grow, ship, or buy, at any scale. This is the
   same "free ambient input, just harvest it" principle the orbital
   platforms use with sunlight — here the free input is the nutrients
   already dissolved in the water column.
2. **No fresh water, no arable land, no fertilizer runoff.** Every input
   problem that makes terrestrial agriculture expensive and land-hungry
   simply doesn't apply.
3. **Storm-grade engineering and mooring are the one hard problem, and
   it's already solved at scale by two existing industries** — offshore
   oil/gas platforms and offshore wind — whose survivability engineering
   transfers directly. This is not speculative technology the way
   orbital bioreactor dewatering is; commercial offshore longline farms
   and floating solar installations both already exist and operate
   today, just not combined at this scale or integrated with each other.

## Growing technology: the decision, not a survey

**All plant-based: sugar kelp (*Saccharina latissima*) longline culture
as the bulk crop, dulse (*Palmaria palmata*) longline culture as an
integrated protein-dense secondary crop.** No animals, no shellfish, no
finfish. Reasoning:

- Dulse is one of the most protein-dense foods the ocean produces at
  all — 20-35% protein by dry weight, in the same range as soy — plus
  iron, and B-vitamin-family compounds most plant staples lack. It
  covers the same protein/micronutrient gap an animal crop would have,
  without being one.
- Sugar kelp is the bulk biomass crop: fast-growing (some strains add
  several centimeters a day in season), high in fiber, carbohydrates,
  and iodine — the calorie/volume workhorse alongside dulse's protein
  density.
- Multi-species polyculture (not a monoculture) is itself a real,
  operating aquaculture principle — different species occupy different
  parts of the water column and nutrient niche, improving total yield
  and resilience versus either species grown alone.
- Both crops are harvested, dewatered/dehydrated on-platform, and
  shipped as a stable dry product — never transport water, same
  principle used everywhere else in this system.

Finfish and shellfish aquaculture are both rejected for this
application — not on efficiency grounds alone, but because this design
is committed to being fully plant-based, no animal husbandry of any
kind, at any trophic level.

## Platform architecture

- **One central hub platform per farm, with longline arrays radiating
  out from it.** The hub carries the solar array, processing equipment,
  autonomy/comms, microplastic filtration intake, and crew-optional
  maintenance deck. Longlines — parallel horizontal ropes suspended
  between anchored buoys, kelp and dulse on interspersed grow lines —
  extend outward from the hub across the farm's footprint. This is the
  standard commercial longline layout, just built at a larger,
  autonomous scale.
- **Total footprint per farm: ~1 km².** Roughly 60 km of kelp grow line
  and 20 km of dulse grow line spaced across that area — a scale-up of
  existing commercial longline density, not a new density regime.
- **Floating solar covers ~0.2 km² (20 hectares) of the footprint**,
  sited close to the hub for short cable runs, generating **~15 MW
  peak** (using ~75 MW/km² as the areal density, consistent with
  existing utility-scale floating solar installations).
- **Sited in nutrient-rich coastal shelf waters, not open blue-water
  ocean** — upwelling zones and continental shelf waters (e.g. off West
  Africa, the Peruvian/Chilean coast, California) have the dissolved
  nutrient density seaweed actually needs. Blue-water gyres are nutrient
  deserts and would starve the crop; siting is a real constraint, not a
  free choice of any ocean coordinate. (Ironically, this is *not* where
  microplastic concentration is highest — see the filtration section
  below for why that's still worth doing here anyway.)

## Subsystems every unit needs

| Subsystem | Function | Design notes |
|---|---|---|
| Floating solar array | Power for winches, processing, autonomy, comms, filtration pumps | ~15 MW peak; no eclipse cycle to design around (unlike the orbital platforms), but does need cleaning for salt-spray fouling |
| Longline cultivation gear | The growing infrastructure itself | Kelp and dulse grow lines strung between anchored surface buoys; replaced every 2-3 years due to biofouling/wear, independent of the platform's own structural lifetime |
| Autonomous harvesting winches | Haul, strip, and sort lines on a rolling schedule | The equivalent of the orbital platforms' harvest robotics — same "hardest unsolved piece at full autonomy" caveat applies here too |
| On-platform processing | Dewatering/dehydration of both crops, packaging | Dehydration before shipping — same "never transport water" principle as the deorbit capsules |
| Microplastic filtration intake | Passive fine-mesh filtration modules mounted on current-facing mooring/support structure | Rides on infrastructure the farm needs anyway (moorings, buoys) — no dedicated structure, no dedicated siting; captures what passes through, doesn't chase it |
| Mooring / station-keeping | Keep the hub and longline array in place through weather and current | The dominant engineering cost driver — see below |
| Autonomy computer + comms | Run the grow/harvest/process/store/filter cycle, monitor water quality, report status | Same fail-safe philosophy as the orbital platforms: default on comms loss is hold position, not attempt open-ocean transit |
| Cold-chain / dry storage | Hold processed product and captured debris until pickup | Bridges the gap between continuous harvest and periodic ship pickup |

## Microplastic filtration: a secondary service, not the mission

The farm's existing footprint and mooring infrastructure already sit in
continuous contact with a large volume of moving seawater — fine-mesh
passive filtration modules attached to the current-facing side of the
mooring/buoy structure capture suspended microplastic (5mm and smaller)
as ambient current flows through, no dedicated intake structure or
pumping-against-current required. **Honest limitation, stated plainly:**
these farms are sited for nutrient-rich coastal shelf water, not for
maximum microplastic density — open-ocean gyres have far higher plastic
concentration than the coastal waters this design needs for its crop.
This is not the optimal site choice for plastic removal on its own; it's
a secondary benefit riding on infrastructure the farm needs regardless,
at effectively zero marginal siting cost. Planning-baseline estimate,
not a delivered fact: on the order of a few hundred kg to low
single-digit tonnes of microplastic/marine debris captured per farm per
year — small next to the food yield by mass, but cumulative across a
fleet of farms, and it's additive to the food mission rather than
competing with it for space, power, or mooring capacity.

## Harvest logistics: reuses the existing "ship" delivery mode

Unlike the orbital platforms — which needed an entirely new
deorbit-capsule delivery mechanism because there was no existing way to
get cargo from orbit to a surface coordinate — ocean farms sit in
coastal waters a normal cargo vessel can reach directly. **No new
delivery mode or mechanism is needed.** A farm is simply a **new hub
type** (`hubType: "ocean_farm"`) that **ship**-mode routes can originate
from, exactly like the existing sea-port hubs. Captured microplastic
waste rides back to shore on the same vessels that carry the food
product away, for recycling/disposal onshore. This is a deliberate
simplification versus the orbital design, not an oversight — the
physical reality is genuinely simpler here.

## What must be maintained/resupplied, and why

- **Kelp and dulse spore-seeded twine**, restocked onto lines after each
  harvest cycle — the crop itself isn't perpetual on a single line, only
  the platform and its ability to keep reseeding are.
- **Longline gear replacement** every 2-3 years (biofouling, wave wear)
  — the ropes and grow lines, not the platform structure.
- **Filtration mesh replacement** — UV and saltwater degrade fine mesh
  over time, same maintenance category as the cultivation gear.
- **Solar panel cleaning** — salt spray fouling measurably degrades
  output if left unaddressed.
- **Mooring/anchor inspection and repair** — the single point of
  failure for the entire platform if a line parts in a storm.
- **Spare parts for winches and processing equipment** the onboard
  robotics can swap but not manufacture.

Resupply arrives on the same ship-mode vessels that carry product (and
captured debris) away — a round trip, not a dedicated resupply run,
another simplification versus the orbital platforms (which need
dedicated launches).

## Autonomy and failure handling

- **Water quality alert (harmful algal bloom or contamination event)**
  → halt harvest immediately, quarantine affected lines, resume only
  after water quality clears — a food-safety fail-safe, not a
  yield-optimization one.
- **Storm/high-wave warning** → non-essential systems (processing,
  winches, filtration pumps) shed power and pause; solar array
  orientation/ballast adjusts for minimum wave-catching profile; hub
  rides it out moored, not evacuated.
- **Mooring line failure** → drift alert raised immediately, station-
  keeping thrusters (present for minor position correction, not primary
  propulsion) engage, human/vessel response dispatched — a parted
  mooring line is the platform's single largest failure mode.
- **Biofouling beyond threshold** → flag line segment for early
  replacement rather than let it degrade yield silently.
- **Filtration intake clogging** → flag for cleaning rather than let it
  choke water flow through the cultivation lines themselves — the
  filtration system must never be allowed to compromise the food
  mission it's riding alongside.
- **Power fault** → shed processing, winches, and filtration pumps
  first, preserve station-keeping and comms last, same priority order as
  the orbital platforms.

## Per-unit specification (planning baseline)

| Parameter | Value |
|---|---|
| Siting | Nutrient-rich coastal shelf waters (upwelling zones), not open blue-water ocean |
| Total footprint | ~1 km² per farm |
| Longline length | ~60 km kelp, ~20 km dulse |
| Floating solar capacity | ~15 MW peak (~0.2 km² array) |
| Kelp yield | ~900 t/yr wet weight → ~108 t/yr dehydrated product |
| Dulse yield | ~60 t/yr wet weight → ~12 t/yr dehydrated product |
| Combined dehydrated food output | ~120 t/yr per farm |
| Microplastic/debris capture | Low hundreds of kg to low single-digit tonnes/yr — secondary benefit, not the site-selection driver |
| Gear replacement cycle | 2-3 years (longlines, filtration mesh), independent of platform structural life |
| Design lifetime | ~20-25 years (platform/mooring structure) |
| Dominant cost driver | Mooring/anchoring and storm-survivability engineering — the equivalent of the orbital platforms' cost-per-kg-to-LEO as the single line item deciding whether a site is viable at all |

## Where this fits in the existing system

A new hub type (`"ocean_farm"`, fifth alongside `port`/`air`/`space`/
`depot`) sited at real-feeling coastal upwelling coordinates. Ship-mode
delivery routes can originate from it exactly like a sea port — no new
route/delivery mechanism required. Production tracking should follow the
same pattern already built for the orbital platforms (a real, uncapped
counter driven by this doc's yield figures, computed from actual elapsed
time, shown on click) rather than a static description — plausibly two
counters per farm, food output and microplastic captured, both ticking
independently. Visually, this is a natural fifth entry for the hub
line-shape family in `src/lineShapes.ts` —
`cross6`/`tetraX`/`cubeStar`/`star12` already cover four of the five
Platonic solids (octahedron, tetrahedron, cube, icosahedron); the
dodecahedron (20 vertices) is the one left, which would complete the
set.
