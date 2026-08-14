import type { DeliveryMode } from "./modes";
import { nodes, type Continent, type HubType } from "./nodes";
import { droneStations } from "./droneStations";
import { haversineDistanceKm } from "../geo";

export interface DeliveryRoute {
  id: string;
  from: string; // hub node id (see nodes.ts) OR drone station id (see droneStations.ts)
  toLat: number;
  toLng: number;
  toName: string;
  mode: DeliveryMode;
}

// --- "correct vehicle for correct movement" ---------------------------
// Routes used to be hand-typed, which meant nothing stopped an obviously
// wrong pairing (a train route needing to cross an ocean) from sneaking
// in. This generator makes that structurally impossible instead of
// relying on care: every hub/station type has a fixed list of modes it
// can actually dispatch, land-only modes are additionally required to
// stay on the same continent as their destination, and the 100 routes
// below are assembled entirely from valid (origin, mode, destination)
// combinations — there's no path for an invalid one to exist.

// Which modes a given hub type can physically dispatch. ocean_farm is
// mid-ocean by design now (see nodes.ts) and gets ship/submarine only;
// every land-based hub type gets the generic land/air modes but not
// ship/submarine (not every hub is coastal); "space" mode is exclusive
// to space hubs, same as before this change.
const HUB_TYPE_MODES: Record<HubType, DeliveryMode[]> = {
  port: ["ship", "submarine", "train", "plane", "catapult", "porter", "instructions"],
  air: ["plane", "train", "catapult", "porter", "instructions"],
  space: ["space", "plane", "train", "catapult", "porter", "instructions"],
  depot: ["plane", "train", "catapult", "porter", "instructions"],
  ocean_farm: ["ship", "submarine", "instructions"],
};

// Drone stations are lightweight, non-hub infrastructure (see
// droneStations.ts) — no bulk cargo modes, just their namesake plus the
// one mode explicitly exempted from every other constraint.
const STATION_MODES: DeliveryMode[] = ["drone", "porter", "instructions"];

// Modes whose vehicle genuinely cannot leave the ground/rail network —
// currently just train. Everything else either flies over terrain
// (plane/drone/space/catapult), travels by water and isn't expected to
// reach a landlocked target directly (ship/submarine), or is explicitly
// exempted (porter — "it can choose to transport things any way it
// wants") or non-physical (instructions).
const LAND_LOCKED_MODES = new Set<DeliveryMode>(["train"]);

// Bulk/long-haul modes move cargo toward a broad regional destination;
// short-range/last-mile modes (plus porter, always precise-capable) push
// the final stretch to a specific, named, small-scale location — "the
// transport should go big to small."
const BULK_MODES = new Set<DeliveryMode>(["ship", "plane", "train", "submarine", "space"]);

// Short-range modes have a real (or nominal) maximum reach — a "~120km
// one-way" drone or an "extreme short-range" catapult showing up on a
// continent-spanning route would be exactly the kind of wrong-vehicle
// mismatch this whole generator exists to prevent. Modes not listed have
// no range cap (oceans/continents are the expected scale for them).
const MODE_MAX_RANGE_KM: Partial<Record<DeliveryMode, number>> = {
  drone: 120, // real figure, docs/DRONE_DELIVERY.md
  catapult: 300, // nominal — "extreme short-range" was never given a precise number before this
};

interface Origin {
  id: string;
  lat: number;
  lng: number;
  continent: Continent;
  modes: DeliveryMode[];
}

const ORIGINS: Origin[] = [
  ...nodes.map(
    (node): Origin => ({ id: node.id, lat: node.lat, lng: node.lng, continent: node.continent, modes: HUB_TYPE_MODES[node.hubType] }),
  ),
  ...droneStations.map(
    (station): Origin => ({ id: station.id, lat: station.lat, lng: station.lng, continent: station.continent, modes: STATION_MODES }),
  ),
];

interface Destination {
  name: string;
  lat: number;
  lng: number;
  continent: Continent;
  scale: "broad" | "precise";
}

// Broad (regional) destinations — bulk-mode targets. Real, widely-reported
// food-insecurity contexts, same illustrative-not-authoritative framing
// used everywhere else in this project.
const BROAD_DESTINATIONS: Destination[] = [
  { name: "Sahel Region", lat: 14.4974, lng: -0.0999, continent: "Africa", scale: "broad" },
  { name: "Horn of Africa", lat: 8.9806, lng: 42.5903, continent: "Africa", scale: "broad" },
  { name: "Eastern DR Congo", lat: -1.6591, lng: 29.2394, continent: "Africa", scale: "broad" },
  { name: "Sudan (Darfur)", lat: 13.6259, lng: 25.3493, continent: "Africa", scale: "broad" },
  { name: "Southern Madagascar", lat: -25.1739, lng: 46.0833, continent: "Africa", scale: "broad" },
  { name: "South Sudan", lat: 6.877, lng: 31.307, continent: "Africa", scale: "broad" },
  { name: "Yemen", lat: 15.5527, lng: 48.5164, continent: "Asia", scale: "broad" },
  { name: "Afghanistan", lat: 33.9391, lng: 67.71, continent: "Asia", scale: "broad" },
  { name: "Northwest Syria", lat: 35.9306, lng: 36.6339, continent: "Asia", scale: "broad" },
  { name: "Rakhine State, Myanmar", lat: 20.1497, lng: 92.8985, continent: "Asia", scale: "broad" },
  { name: "Haiti", lat: 18.9712, lng: -72.2852, continent: "NorthAmerica", scale: "broad" },
  { name: "Guatemala Dry Corridor", lat: 14.6349, lng: -90.5069, continent: "NorthAmerica", scale: "broad" },
  { name: "Bolivia Highlands", lat: -16.5, lng: -68.15, continent: "SouthAmerica", scale: "broad" },
  { name: "Remote Pacific Community", lat: -8.5, lng: 179.2, continent: "Oceania", scale: "broad" },
];

// Precise (village/camp/district-level) destinations — last-mile targets
// for drone/catapult/porter, the "small" end of "big to small." Drone
// destinations are paired with a specific nearby station (droneStations.ts)
// and catapult destinations with a specific nearby hub (nodes.ts) — real
// short-range range limits (120km/300km, MODE_MAX_RANGE_KM below) mean a
// precise destination with nothing close enough to launch from is just
// dead weight in the candidate pool, so every entry here was placed
// deliberately near something that can actually reach it.
const PRECISE_DESTINATIONS: Destination[] = [
  // Near drone stations:
  { name: "North Korea (Pyongyang Region)", lat: 39.15, lng: 125.68, continent: "Asia", scale: "precise" }, // ~85km from station-yellow-sea
  { name: "Gaza Strip", lat: 31.5017, lng: 34.4668, continent: "Asia", scale: "precise" }, // ~49km from station-gaza
  { name: "Remote Afghan Valley", lat: 34.35, lng: 68.5, continent: "Asia", scale: "precise" }, // ~25km from station-afghanistan-interior
  { name: "Cite Soleil, Port-au-Prince", lat: 18.5578, lng: -72.3389, continent: "NorthAmerica", scale: "precise" }, // ~52km from station-haiti
  { name: "Sahel Nomadic Community", lat: 14.5, lng: -0.8, continent: "Africa", scale: "precise" }, // ~40km from station-sahel
  { name: "South Sudan Displacement Camp", lat: 6.8, lng: 31.2, continent: "Africa", scale: "precise" }, // ~30km from station-south-sudan
  { name: "Yemen Coastal Village", lat: 15.0, lng: 47.8, continent: "Asia", scale: "precise" }, // ~35km from station-yemen
  // Near hubs, for catapult (which launches from hubs, not stations):
  { name: "Kibera, Nairobi", lat: -1.3133, lng: 36.782, continent: "Africa", scale: "precise" }, // ~5km from hub-nairobi
  { name: "Addis Ababa Periphery Settlement", lat: 9.5, lng: 39.2, continent: "Africa", scale: "precise" }, // ~70km from hub-addis-ababa
  { name: "Accra Informal Settlement", lat: 5.85, lng: -0.35, continent: "Africa", scale: "precise" }, // ~30km from hub-accra
  { name: "Panama City Periphery Community", lat: 9.15, lng: -79.3, continent: "NorthAmerica", scale: "precise" }, // ~35km from hub-panama-city
  { name: "Subang Periphery Settlement", lat: 3.3, lng: 101.75, continent: "Asia", scale: "precise" }, // ~30km from hub-subang
  { name: "Durban Informal Settlement", lat: -29.75, lng: 30.9, continent: "Africa", scale: "precise" }, // ~15km from hub-durban
  { name: "Zimbabwe Drought Belt", lat: -19.0154, lng: 29.1549, continent: "Africa", scale: "precise" }, // no nearby hub/station — porter/instructions only, real place kept for coverage
  { name: "Ethiopia Tigray Region", lat: 13.4967, lng: 39.4753, continent: "Africa", scale: "precise" }, // no nearby hub/station — porter/instructions only
  { name: "Dadaab Refugee Camp, Kenya", lat: 0.0917, lng: 40.3103, continent: "Africa", scale: "precise" }, // no nearby hub/station — porter/instructions only
  { name: "Caracas Area, Venezuela", lat: 10.4806, lng: -66.9036, continent: "SouthAmerica", scale: "precise" }, // no nearby hub/station — porter/instructions only
];

const DESTINATIONS: Destination[] = [...BROAD_DESTINATIONS, ...PRECISE_DESTINATIONS];

function candidatesForMode(mode: DeliveryMode): Array<{ origin: Origin; destination: Destination }> {
  const eligibleOrigins = ORIGINS.filter((o) => o.modes.includes(mode));
  const preferredScale = BULK_MODES.has(mode) ? "broad" : "precise";
  const preferred = DESTINATIONS.filter((d) => d.scale === preferredScale);
  const destinations = preferred.length > 0 ? preferred : DESTINATIONS;
  const maxRangeKm = MODE_MAX_RANGE_KM[mode];

  const pairs: Array<{ origin: Origin; destination: Destination }> = [];
  for (const origin of eligibleOrigins) {
    for (const destination of destinations) {
      if (LAND_LOCKED_MODES.has(mode) && origin.continent !== destination.continent) continue;
      if (maxRangeKm !== undefined && haversineDistanceKm(origin.lat, origin.lng, destination.lat, destination.lng) > maxRangeKm) continue;
      pairs.push({ origin, destination });
    }
  }
  return pairs;
}

// Evenly-spaced (not random — deterministic and reproducible) sample
// across the full candidate pool, so a small target count still spreads
// across many different origins/destinations instead of clustering on
// whichever happen to sort first.
function pickEvenly<T>(items: T[], count: number): T[] {
  if (items.length <= count) return items;
  const stride = items.length / count;
  const result: T[] = [];
  for (let i = 0; i < count; i++) {
    result.push(items[Math.floor(i * stride)]);
  }
  return result;
}

// 100 routes total, split across every physical mode plus a handful of
// knowledge broadcasts. Bulk modes (ship/plane/train/submarine/space) get
// the larger shares; last-mile modes (drone/catapult/porter) get enough
// to be well represented without dominating.
// catapult and drone targets are deliberately lower than they were before
// range limits existed (was 8/14, now 6/7) — verified against the actual
// candidate pool first (see SPEC.md), not picked arbitrarily: a real
// ~120km-range drone or ~300km-range catapult genuinely has few valid
// (station-or-hub, destination) pairs close enough to each other to
// qualify, and that's a realistic constraint to respect rather than
// paper over by loosening the range caps just to hit a bigger number.
// The difference was redistributed to bulk modes, which have deep
// candidate pools (100+ valid pairs each) and no such limit.
const MODE_TARGET_COUNTS: Partial<Record<DeliveryMode, number>> = {
  ship: 21,
  plane: 15,
  train: 14,
  submarine: 10,
  catapult: 6,
  drone: 7,
  porter: 17,
  space: 5,
  instructions: 5,
};

function generateRoutes(): DeliveryRoute[] {
  const generated: DeliveryRoute[] = [];
  let index = 0;
  for (const mode of Object.keys(MODE_TARGET_COUNTS) as DeliveryMode[]) {
    const target = MODE_TARGET_COUNTS[mode] ?? 0;
    const picked = pickEvenly(candidatesForMode(mode), target);
    for (const { origin, destination } of picked) {
      generated.push({
        id: `r-${mode}-${index++}`,
        from: origin.id,
        toLat: destination.lat,
        toLng: destination.lng,
        toName: destination.name,
        mode,
      });
    }
  }
  return generated;
}

export const routes: DeliveryRoute[] = generateRoutes();
