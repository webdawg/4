# Global Food System Design

A strategic architecture for making adequate nutrition reliably available to
every human being, everywhere, under any conditions. This is a **planning
document**, not an operations plan — it defines the framework, the
technology choices and their tradeoffs, the phasing, and the metrics. Turning
it into an operations plan requires running it against real datasets (see
"Data this depends on" at the end of each section) and running real pilots
(see "Test Everything").

**Non-negotiable framing**: food *production* is not food *security*. A
system only counts as working when it simultaneously solves production +
nutrition + storage + transportation + water + energy + affordability +
resilience + access, for the same person, at the same time. The objective is
not "produce more food" — it is **make starvation technologically,
logistically, and economically preventable everywhere on Earth.**

---

## First principle

The wrong question: *"How do we ship more food around the world?"*
The right question: *"What should be produced locally everywhere, what
should be produced regionally, and what actually needs to move globally?"*

Transportation is Layer 0 infrastructure that connects the other layers — it
is not itself the solution. A system that depends on long supply chains for
routine daily nutrition is, by construction, fragile. The layered design
below exists specifically so that a transportation failure (war, blockade,
fuel shortage, port closure, pandemic) degrades a population's diet rather
than starving it.

---

## The global food map (framework, not a finished dataset)

Rather than fabricate precise per-country statistics here, this defines the
**scoring framework** a real deployment must run against live data sources:
FAO GIEWS, WFP HungerMap LIVE, FEWS NET, IPC Acute Food Insecurity phase
classifications, World Bank food-import-dependency ratios, Köppen climate
classification, and national statistics offices. Presenting fabricated
country-level numbers here would be worse than useless — it would look
authoritative while being wrong.

What the framework needs per candidate location:
population, density, climate/Köppen zone, annual sunlight hours, renewable
water availability per capita, grid/off-grid energy access, arable land per
capita, current production vs. import share, transport infrastructure
quality, political stability index, disaster risk (drought/flood/cyclone/
conflict), malnutrition prevalence (stunting/wasting/micronutrient), local
food price relative to income, food-loss rate by stage, and locally
available nutrient/fertilizer feedstocks (manure, crop residue, wastewater,
mineral deposits).

### Zone archetypes

Instead of 190+ individual country profiles, ten archetypes capture the
decision-relevant variation. Every real location maps to one (or a blend):

| Archetype | Representative regions | Dominant constraint | Layer emphasis |
|---|---|---|---|
| Dense fertile temperate | US Midwest, North China Plain, Indo-Gangetic Plain, European lowlands | None structural — optimize, don't replace | Layer 2 (conventional ag is already efficient here) |
| Arid/desert, high income | Gulf states, parts of North Africa | Water, land | Layer 1: desal + CEA/hydroponics |
| Arid/desert, low income | Sahel, Horn of Africa | Water, capital, instability | Layer 1: minimal-input (spirulina, duckweed, drought-resistant crops) + Layer 3 reserves |
| Small island states | Pacific islands, Caribbean | Import dependency, land area, climate shocks | Layer 1: aquaponics, local root crops + resilient reserve/shipping |
| Tropical humid, low income | Central Africa, parts of SE Asia | Infrastructure, soil leaching, not biomass potential | Agroforestry, cassava/sweet potato, aquaculture |
| Conflict/fragile states | Yemen, Syria, Sudan, Gaza, Afghanistan | Infrastructure destroyed or contested | Portable/modular Layer 1 units + humanitarian reserves + protected corridors |
| Cold/Arctic/mountain | Nordic states, Andean highlands, Himalaya | Short growing season | Geothermal/heated greenhouses, root crops, winter reserves |
| Megacities (any climate) | Any city >5M | Land, not capital | Vertical/rooftop CEA for perishables + role as logistics hub |
| Refugee/displacement camps | Camp populations globally | Zero fixed infrastructure | Containerized deployable Layer 1 + RUTF reserves |
| Off-grid remote/rural | Amazon interior, Siberia, Pacific atolls | Reach, not scale | Self-sufficient household/village modules, minimal resupply dependency |

**Data this depends on**: this framework is only as good as the datasets fed
into it. It is designed to consume FEWS NET / WFP / IPC / FAO feeds directly
— see the AI monitoring section.

---

## Layer 1 — Local survival food

Goal: every populated location can produce a minimum nutritionally adequate
diet locally, without depending on imports functioning.

### Technology comparison

| Technology | Land use | Water use | Energy use | Capital/complexity | Output profile | Climate range |
|---|---|---|---|---|---|---|
| Spirulina/algae (raceway ponds) | Very low | Low–moderate; tolerates brackish/saline water | Low if sun-driven, high if photobioreactor+artificial light | Moderate (contamination control) | Very high protein density (~60-70% dry weight) + micronutrients | Warm (~30-35°C optimal); poor in cold climates |
| Duckweed | Very low | Very low; thrives in nutrient-rich/wastewater | Low | Low | High protein (~35-45% dry weight); currently more accepted as feed than direct food (novel-food regulatory hurdle) | Broad, cold-sensitive at extremes |
| Potatoes / sweet potatoes | Moderate | Very low per calorie (among the most water-efficient staples) | Low | Low (mature agronomy) | Very high calories/hectare, moderate protein | Potato: temperate; sweet potato: tropical/subtropical |
| Legumes (soy, peas, lentils, cowpea) | Moderate | Moderate | Low | Low | Protein + fixes nitrogen (reduces fertilizer need) | Broad |
| Mushrooms | Very low (vertical stacking) | Low relative to yield | Low–moderate (climate control) | Low–moderate | Protein + B vitamins; grows on agricultural/food waste substrate | Indoor, climate-independent |
| Hydroponics (sun-lit/greenhouse) | Low | Very low (recirculating, ~90% less than field) | Moderate | Moderate | Vegetables, dietary diversity/vitamins; not calorie-dense | Broad if greenhouse-protected |
| Aquaponics | Low | Low (closed loop, fish waste feeds plants) | Moderate (pumps/aeration) | Moderate | Protein (fish) + vegetables in one system | Broad |
| Vertical farming (artificial light) | Very low | Very low | **High** — lighting dominates cost | High | Leafy greens/herbs only; not viable for bulk calories | Any (fully decoupled from climate) |
| Precision/gas fermentation (microbial protein) | Near zero | Low | High currently, cost-declining | High (early-stage) | Complete protein, decoupled from arable land and weather entirely | Any — including off-grid and eventually off-Earth |
| Greenhouse (passive light) | Moderate | Low–moderate | Low–moderate | Moderate | Extends growing season/climate range for vegetables/fruit | Extends any climate |
| Drought-resistant conventional (sorghum, millet, cassava, teff, cowpea) | Moderate–high | Low | Low | Low (established practice) | Baseline calories, culturally established, resilient, lower yield ceiling | Semi-arid |

### Recommended minimum-viable local nutrition kit

Not one technology — a combination, matched to zone archetype:

1. **Calorie base**: potato/sweet potato/cassava (whichever fits local
   climate) — highest calories per liter of water and per unit of capital.
2. **Protein + soil input**: a legume — doubles as a nitrogen source,
   reducing fertilizer dependency.
3. **Protein/micronutrient booster**, chosen by local resource: spirulina
   where warm water (fresh, brackish, or saline) is available; duckweed or
   mushrooms where organic/wastewater streams exist to feed them.
4. **Fat + micronutrients**, where feasible: household-scale small
   livestock, eggs, or tilapia/aquaponics.

This kit is deliberately boring — every component is proven, cheap, and
climate-adaptable. Novel technologies (fermentation-derived protein, fully
artificial-lit vertical farms) are held in reserve for contexts where they
provide a *genuine* systems advantage (extreme/off-grid/off-Earth,
high-value perishables in land/water-constrained megacities) rather than
deployed by default — matching the energy-economics principle below.

---

## Layer 2 — Regional agriculture

Use conventional agriculture where it is already efficient. Do not displace
productive farmland with expensive novel technology for its own sake.

### Regional specialization (comparative advantage, present-day pattern)

| Category | Where it already works best |
|---|---|
| Grains | US Midwest, Ukraine/Russia/Kazakhstan black-earth belt, Argentina/Brazil Cerrado, Indo-Gangetic Plain, North China Plain, Australia |
| Legumes/pulses | India (largest producer and consumer), Canada, Myanmar, Brazil |
| Oils | Indonesia/Malaysia (palm), US/Brazil/Argentina (soy), Black Sea (sunflower), EU/Canada (rapeseed/canola) |
| Animal products | Grassland belts (US Great Plains, Argentina Pampas, Australia/NZ), established dairy regions (EU, India, US) |
| Aquaculture | China (largest by far), Norway (salmon), Vietnam/Indonesia (shrimp/tilapia), Chile (salmon) — generally far more feed- and water-efficient than terrestrial livestock, especially filter feeders (bivalves) that need no external feed at all |
| Specialty fruits/vegetables | Mediterranean basin, California Central Valley, Mexico, Kenya (horticulture) |

### Redundancy design principle

No staple crop should have production concentrated in a single
climate-correlated region or hemisphere. Northern/Southern Hemisphere
harvest offset already provides partial natural redundancy for grains
(harvests roughly six months apart) — this should be formalized: track a
**concentration risk index** per crop (share of global production in
regions sharing correlated weather/political risk) and treat a high index
as a standing vulnerability to be actively diversified, not a fact to
tolerate.

---

## Layer 3 — Global strategic reserves

Distributed, not centralized. Real precedents this design draws on directly:
WFP's UNHRD network (already reflected in the simulation's hub data — see
"Relationship to the simulation" below), the Svalbard Global Seed Vault,
national grain reserves (China's is the largest in the world; India's Food
Corporation buffer stock; Japan's post-1993 rice reserve).

**Design principles**:
- Reserve nodes sized to regional population and risk profile, not one
  global mega-reserve.
- Each node holds: staple grain/legume, shelf-stable protein and oil,
  micronutrient supplements (including ready-to-use therapeutic food for
  acute child malnutrition), seed stock, and critical spares (water
  treatment membranes, pumps, generators).
- **Rotation, not stockpiling**: reserves cycle into the commercial market
  on a schedule (first-in-first-out) and are continuously replenished —
  the strategic-petroleum-reserve rotation model — so stock doesn't expire
  unused.
- **Pre-negotiated release triggers**, tied to the AI early-warning system
  (Phase 4), agreed *before* a crisis. The 2011 Somalia famine is a
  documented case where early warning existed well ahead of mass
  mortality but political/organizational response lagged; the fix is not
  giving an algorithm authority — it's removing the need to re-negotiate
  release decisions under time pressure by agreeing the trigger conditions
  in advance.

---

## Universal food production module

Standardized, open-specification units at seven scales. Figures below are
**first-pass planning estimates for pilot validation**, not lab-measured
constants — per the "Test Everything" principle, every cell in this table
is a hypothesis to be falsified by a real pilot, not a delivered fact.

| Scale | People supported | Core tech mix | Water/day (order of magnitude) | Electricity/day | Labor | Capital cost (order of magnitude) | Lifetime |
|---|---|---|---|---|---|---|---|
| Household | 4–6 | Rooftop greenhouse + small spirulina/duckweed tank + micro-aquaponics | 10s of liters (recirculating) | <1 kWh (solar-viable) | Part-time, unskilled | Low hundreds USD | 5–10 yr, component swaps |
| Village | ~500 | Shared greenhouse + biodigester + community fish pond + grain store | 100s–1,000s L | Few kWh (solar/micro-hydro viable) | 1–2 part-time roles | Low tens of thousands USD | 10–20 yr structure, shorter for electronics |
| Neighborhood | ~5,000 | Multiple village-scale units + shared processing/storage | 1,000s–10,000s L | 10s of kWh | Small dedicated crew | Hundreds of thousands USD | 10–20 yr |
| City | 500,000+ | Peri-urban CEA for perishables + connection to regional grain supply + city-scale reserve warehouse | Municipal-scale, integrated with wastewater reuse | Grid-scale, ideally partial on-site renewable | Professional staff | Tens of millions USD | 20+ yr for structures |
| Refugee camp | ~20,000 | Containerized hydroponic/spirulina units (real precedent: shipping-container hydroponic farms) + RUTF stockpile | Tanked/trucked initially, wastewater-recovery ASAP | Diesel/solar hybrid, transitioning to solar | NGO/agency-run, some resident labor | Deployable in weeks, mid six figures USD | 3–10 yr, designed for relocation |
| Military/disaster response | ~1,000, rapid | Rapid-deploy modular units, airdrop/vehicle-transportable | Self-contained/tanked | Generator/portable solar | Trained response personnel | High per-unit cost justified by speed | Single-deployment to a few years |
| National strategic | 10M+ backstop | Grain silos + seed bank + fertilizer stockpile + industrial reserve production capacity | N/A (storage, not daily production) | Facility-scale | Government agency | Hundreds of millions to billions USD | Decades, with rotation |

Every module should specify, and every pilot should measure against spec:
food output/day, people supported, water and electricity consumption,
nutrient inputs, labor, maintenance schedule, capital and operating cost,
expected lifetime, replaceable components, and known failure modes. Power
input should accept whatever is locally available — grid, solar, wind,
hydro, geothermal, nuclear, or waste heat — rather than assuming one source.

---

## Closing the resource loops

| Loop | Recovery method | Real precedent |
|---|---|---|
| Phosphorus | Struvite precipitation from wastewater | Deployed commercially (e.g., Ostara Nutrient Recovery Technologies) |
| Nitrogen + energy | Anaerobic digestion of food/agricultural waste → biogas + nutrient-rich digestate | Widely deployed at farm and municipal scale |
| Carbon/soil structure | Biochar from crop-residue pyrolysis | Improves water retention, sequesters carbon |
| Organic matter | Composting of food/ag waste | Established practice |
| CO₂ | Industrial CO₂ streams fed to algae ponds/greenhouses | Standard practice in commercial greenhouse CO₂ enrichment |
| Water | See "Solving water" below | — |

The long-term target for every Layer 1 module: minimize the mass of
material that must be continuously imported into it. A module that only
needs periodic seed/inoculum replenishment is far more resilient than one
that needs continuous fertilizer or feed shipments.

---

## Solving water

Freshwater scarcity is treated as the default binding constraint, not an
edge case. Measure every food source by **nutrition per liter of water**,
not kilograms of biomass.

### Water footprint by food (approximate global averages — vary substantially by region/method; cite original studies, e.g. Mekonnen & Hoekstra, before using for real decisions)

| Food | Approx. L per kg |
|---|---|
| Beef | ~15,000 |
| Pork | ~6,000 |
| Chicken | ~4,300 |
| Eggs | ~3,300 |
| Soybeans | ~2,100 |
| Rice | ~2,500 |
| Wheat | ~1,800 |
| Maize | ~1,200 |
| Potatoes | ~290 |

Potatoes and other tubers are outliers in a good way — very low water cost
per calorie, which is a large part of why they anchor the Layer 1 calorie
base above.

### Techniques, matched to context

- **Rainwater capture** and **precision/drip irrigation**: default,
  low-cost, broadly applicable.
- **Wastewater recycling**: dual-purpose with nutrient recovery above.
- **Desalination**: increasingly cheap, especially solar-coupled reverse
  osmosis — appropriate for coastal arid Layer 1 hubs (Gulf states, some
  Horn of Africa coastline, island states). Brine disposal must be managed
  (pair with salt-tolerant aquaculture or halophyte crops to avoid local
  ecological damage rather than treating brine as pure waste).
- **Atmospheric water generation**: energy-expensive and, counter to
  intuition, works *better* in humid climates than arid ones — many
  food-insecure humid-tropical regions are better AWG candidates than
  deserts. Don't default-deploy this in deserts just because it sounds
  climate-appropriate.
- **Groundwater management**: monitor extraction against recharge rate;
  groundwater over-drafting is a slow-motion version of the exact fragility
  this system is designed to avoid.

**Transport principle**: never ship water. Move concentrated, dehydrated,
shelf-stable product (dried milk powder, dehydrated vegetables, freeze-dried
rations are the real-world precedent) and reconstitute with local water near
the destination.

---

## Solving energy

Energy cost per unit of nutrition, not per unit of biomass, is the
optimization target — and the ranking is not close:

**Field agriculture** (near-zero direct energy beyond mechanization and
fertilizer production, since sunlight is free) **< greenhouse with passive
light < hydroponics under natural light < vertical farming with artificial
lighting** (often cited on the order of 30–50× the energy per kg versus
field-grown for the same crop).

This is why Layer 1's recommended kit avoids artificial-lit vertical
farming for bulk calories — it is reserved for cases with a genuine systems
advantage: extreme/off-grid/eventually off-Earth environments, or
high-value perishables (leafy greens/herbs) in land- and water-constrained
megacities and import-dependent island/desert states, where the *land and
water* savings outweigh the energy cost.

**Matching energy source to context**: solar/wind for most Layer 1 modules
in sunny regions; geothermal for cold/volcanic regions (Iceland's
commercial geothermal greenhouses are a working real-world example);
industrial/data-center waste heat for urban CEA; nuclear or grid power for
Layer 2/3 infrastructure (irrigation pumping, fertilizer synthesis).

**Fertilizer is an energy problem in disguise**: Haber-Bosch ammonia
synthesis for nitrogen fertilizer consumes on the order of 1–2% of *global*
energy use. Decarbonizing and localizing fertilizer production (green
ammonia via renewable-powered electrolysis) is one of the highest-leverage
long-term interventions in this entire system, not a side detail.

---

## Solving distribution

The existing simulation's hub network (ports, air cargo hubs, orbital
launch sites, humanitarian depots) is the physical backbone this layer
operates on. Distribution logic:

- **Minimize transport of bulk raw/wet commodities** where a local Layer
  1/2 alternative exists. Reserve global shipping for genuinely
  non-substitutable flows: grain from surplus to deficit regions,
  specialty nutrient inputs, fertilizer feedstocks, emergency/medical
  nutrition.
- **Mode selection by justification, not default**: ships and rail for
  bulk/routine; trucks for regional; aircraft only where speed
  genuinely matters (emergency, high-value perishable); drones for
  specialized last-mile in disaster/remote contexts (Zipline's drone
  medical/blood delivery network in Rwanda and Ghana is a working
  precedent directly extensible to food/nutrition supplements).
- **Dehydrate, don't hydrate, for transport** — see water section.
- The depot/hub network doubles as both routine distribution
  infrastructure and Layer 3 reserve infrastructure — the same physical
  nodes serve both purposes rather than building parallel systems.

---

## Solving food waste

Widely cited FAO/UNEP figures put global food loss and waste at roughly
**one-third of food produced for human consumption** (on the order of 1.3
billion tons/year) — but the location of that waste differs sharply by
income level, and so does the cheapest fix:

- **Low-income countries**: loss is concentrated on-farm and
  post-harvest — poor storage, pests, spoilage before the food ever
  reaches a market. Cheapest fix: on-farm storage (hermetic bags, small
  metal silos), cold chain for perishables, better rural roads. These
  interventions are typically far cheaper per ton saved than growing an
  additional ton of replacement food.
- **High-income countries**: waste is concentrated at retail and
  household level — oversupply, date-label confusion, consumer behavior.
  Cheapest fix is policy/behavioral (standardized date labeling, retail
  donation incentives), not infrastructure.

**Rule**: before funding new production capacity in a given location, check
whether preventing a ton of loss there is cheaper than producing a
replacement ton. It usually is, especially in low-income, high-loss
contexts — implement the cheaper intervention first.

---

## Solving economic access

Hunger frequently occurs where food physically exists but people can't
afford it. This system explicitly does not stop at production.

**Real precedents this draws on**: Brazil's Bolsa Família cash transfer
program plus its PNAE school meal program; India's Public Distribution
System (the world's largest food subsidy program by population covered);
Ethiopia's Productive Safety Net Programme (predictable multi-year
cash-plus-food transfers tied to public works, credited with building
resilience against repeat famine rather than just responding to it); WFP's
shift toward cash-based transfers where local markets function.

**Governing principle**: prefer cash or electronic food credits when local
markets can supply food — this supports the local agricultural economy
instead of undermining it, and preserves recipient dignity and choice.
Reserve in-kind food distribution for contexts where markets have failed
or don't exist: acute emergencies, refugee camps, active conflict. Dumping
in-kind food aid into a functioning market destroys local farmer incomes
and creates long-term dependency — treat that as a design failure to
avoid, not an acceptable side effect.

---

## Open global food technology standard

Publish core module designs openly. Standardize interfaces, pumps,
sensors, plumbing, nutrient dosing systems, control software, replacement
parts, monitoring protocols, and food-safety procedures — so no critical
food infrastructure depends on a single vendor.

**Real precedents to build on rather than reinvent**: the Svalbard Seed
Vault's open-germplasm principle; the CGIAR/GODAN (Global Open Data for
Agriculture and Nutrition) open-data movement; open-hardware precedents
like FarmBot and Open Source Ecology; existing industrial IoT protocols
(MQTT, Modbus) as a starting point for a module control-software standard
rather than inventing a new one. A certification/interoperability body
(the Wi-Fi Alliance model) should verify that independently manufactured
modules are genuinely compatible.

---

## Continuous AI monitoring

The planetary food-system model should be a **coordination layer fused on
top of existing real early-warning systems**, not a from-scratch
replacement for decades of humanitarian data infrastructure. Those systems
already exist and are operational:

- **FEWS NET** (USAID Famine Early Warning Systems Network)
- **WFP HungerMap LIVE** (satellite + mobile survey + market price data)
- **FAO GIEWS** (Global Information and Early Warning System)
- Satellite crop-condition monitoring (Copernicus, NASA, NDVI-based
  vegetation indices)
- Commodity futures markets as a real-time price signal

The model's job: fuse these feeds with the reserve-inventory,
transportation-capacity, and module-status data generated by this system's
own infrastructure, and predict shortages before they're visible in acute
malnutrition data. When a shortage becomes probable, generate
recommendations — production increases, reserve releases, alternate
suppliers, transport rerouting, emergency planting, humanitarian
intervention — against the **pre-negotiated triggers** from the reserves
section.

**Humans remain responsible for consequential political and humanitarian
decisions.** The lesson from documented early-warning failures (Somalia
2011 again being the clearest case) is not "give the algorithm authority"
— it's "don't make humans re-decide the response plan from scratch while
people are already dying." Pre-agreement removes the delay; it doesn't
remove human judgment from the loop.

---

## Test everything

No technology in this document is assumed to work because it looks
efficient on paper. Every module and every technology choice goes through:

**bench/lab test → single-site pilot (household/village scale) →
multi-site pilot across at least three zone archetypes → regional
scale-up → open-standard publication.**

Measured at every stage: real yield, real energy consumption, real water
consumption, real maintenance burden, real nutritional output, real cost,
cultural acceptance, and reliability.

**Kill criteria** (explicit, decided in advance, not post-hoc): retire a
technology for a given context if its real operating cost per person fed
exceeds a defined multiple of the cheapest viable regional alternative, if
reliability/uptime falls below a defined threshold, or if cultural
acceptance fails. Scale what repeatedly survives; don't sink further
investment into what doesn't.

---

## Phased implementation

**Phase 1 — Identify the 100 highest-leverage locations.** Composite score
= import dependency × instability/conflict risk × malnutrition prevalence ×
(infrastructure gap ÷ cost-to-close-it). This needs to run against real IPC/
FEWS NET/WFP/World Bank data to produce an actual ranked 100 — this document
doesn't fabricate that ranking. Notably, the simulation's current 13
need-region nodes (Sahel, Horn of Africa, Yemen, South Sudan, Sudan/Darfur,
Gaza, Haiti, Afghanistan, Eastern DRC, Northwest Syria, Rakhine/Myanmar,
Southern Madagascar, Remote Pacific) were independently chosen for being
widely-reported crisis regions — they're a reasonable illustrative
*subset* of what a real Phase 1 list would contain, not the finished list.

**Phase 2** — Deploy Layer 1 pilots at those locations; strengthen existing
Layer 2 agriculture rather than displacing it.

**Phase 3** — Stand up regional production specialization and the
distributed Layer 3 reserve network.

**Phase 4** — Connect production forecasts, reserve inventories,
transportation capacity, and shortage predictions (built on the existing
FEWS NET/WFP/GIEWS feeds above) into the coordination layer.

**Phase 5** — Every major population center reaches a defined minimum: local
production plus stored reserves sufficient to survive a major external
supply interruption without acute crisis.

**Phase 6** — Continuous reduction of cost, water use, energy use,
environmental impact, and fragile-supply-chain dependency. This phase does
not end.

---

## Measuring success

Not facilities built, dollars spent, or tons produced. Instead:

- Humans receiving adequate nutrition
- Cost per person fed
- Childhood malnutrition (stunting/wasting) rate
- Famine mortality
- Micronutrient deficiency prevalence
- Food affordability relative to income
- Days of emergency food reserve (reserve stock ÷ average daily consumption
  for the covered population)
- Local production resilience (share of minimum diet a location can
  produce without imports)
- Liters of water per person fed
- Energy per person fed
- System uptime during declared disasters

---

## Relationship to the simulation in this repo

This document is the strategic layer; `src/` is currently a *visualization*
of one small slice of it. Concretely, today's simulation already lines up
with parts of this framework:

- `src/data/nodes.ts`'s `hubType` (`port` / `air` / `space` / `depot`)
  is a first pass at Layer 2/3 infrastructure — `depot` nodes are modeled
  directly on the real WFP UNHRD network referenced in the Layer 3 section
  above.
- The 13 `need` nodes are a plausible illustrative subset of a real Phase 1
  list, not a finished one (see Phase 1 above).
- `docs/VISION.md`'s five delivery modes (space/plane/ship/catapult/
  instructions) map onto this document's distribution-mode-selection
  principle, plus the "instructions" mode is this document's Layer 1
  local-production-knowledge idea, literally.

What this document adds that the code doesn't have yet: the zone-archetype
typology, the Layer 1/2/3 structure itself, the universal module spec
table, resource-loop/water/energy tradeoff data, and the phased rollout —
none of which are represented in the data model yet. A natural next step,
if wanted, is extending `DeliveryNode` with a `zoneArchetype` and/or
`productionLayer` field and a `modules` dataset so the simulation can start
to *represent* this design instead of only the transportation layer on top
of it — but that's a separate decision, not assumed here.
