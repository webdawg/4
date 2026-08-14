// Hub coordinates are real, publicly known locations (major sea ports, air
// cargo hubs, orbital launch sites, the UN's UNHRD humanitarian depot
// network, and floating ocean farms out in open ocean — see
// docs/OCEAN_FARM.md; positions were pulled further offshore from the
// coastal upwelling zones originally cited there, per explicit direction
// to put them "in the middle of the ocean" rather than coast-hugging —
// still within the same ocean basin as the upwelling system named, but no
// longer claiming to sit exactly on it).
//
// This used to also include a hand-authored set of illustrative "need"
// regions with a fake 0-1 severity level, rendered as sprites on the
// globe. Those were removed — need/food-insecurity severity is now driven
// by real HDX HAPI data (public/data/food_security_admin1.json,
// public/data/food_security_current.json) rendered as a heatmap on the
// country/admin1 boundary polygons, not by sprites at all. See SPEC.md's
// "granular need heatmap" update for the full story of why.
export type HubType = "port" | "air" | "space" | "depot" | "ocean_farm";

// Used by the route generator (src/data/routes.ts) to keep land-only modes
// (train) from being asked to cross an ocean — "you can't have cars going
// over water." Ocean farm hubs don't get a load-bearing continent (they're
// mid-ocean by design), it's kept only for display/grouping.
export type Continent = "Africa" | "Asia" | "Europe" | "NorthAmerica" | "SouthAmerica" | "Oceania";

export interface DeliveryNode {
  id: string;
  name: string;
  lat: number;
  lng: number;
  hubType: HubType;
  continent: Continent;
}

export const nodes: DeliveryNode[] = [
  // --- Hubs: sea ports -----------------------------------------------
  { id: "hub-rotterdam", name: "Rotterdam Port Hub", lat: 51.9225, lng: 4.47917, hubType: "port", continent: "Europe" },
  { id: "hub-singapore", name: "Singapore Port Hub", lat: 1.3521, lng: 103.8198, hubType: "port", continent: "Asia" },
  { id: "hub-shanghai", name: "Shanghai Port Hub", lat: 31.2304, lng: 121.4737, hubType: "port", continent: "Asia" },
  {
    id: "hub-los-angeles",
    name: "Los Angeles / Long Beach Port Hub",
    lat: 33.7701,
    lng: -118.1937,
    hubType: "port",
    continent: "NorthAmerica",
  },
  { id: "hub-santos", name: "Santos Port Hub", lat: -23.9608, lng: -46.3339, hubType: "port", continent: "SouthAmerica" },
  { id: "hub-mumbai", name: "Mumbai (JNPT) Port Hub", lat: 18.949, lng: 72.9525, hubType: "port", continent: "Asia" },
  { id: "hub-durban", name: "Durban Port Hub", lat: -29.8587, lng: 31.0218, hubType: "port", continent: "Africa" },
  // Closes a coverage gap docs/AUTONOMOUS_TRANSPORT.md flagged explicitly:
  // no hub anywhere in Australia/Oceania until this one.
  { id: "hub-fremantle", name: "Fremantle Port Hub", lat: -32.0569, lng: 115.7439, hubType: "port", continent: "Oceania" },

  // --- Hubs: air cargo -------------------------------------------------
  { id: "hub-miami", name: "Miami Air Hub", lat: 25.7617, lng: -80.1918, hubType: "air", continent: "NorthAmerica" },
  { id: "hub-dubai", name: "Dubai Air Hub", lat: 25.2048, lng: 55.2708, hubType: "air", continent: "Asia" },
  { id: "hub-memphis", name: "Memphis Air Hub", lat: 35.0424, lng: -89.9767, hubType: "air", continent: "NorthAmerica" },
  { id: "hub-hong-kong", name: "Hong Kong Air Hub", lat: 22.308, lng: 113.9185, hubType: "air", continent: "Asia" },
  { id: "hub-frankfurt", name: "Frankfurt Air Hub", lat: 50.0379, lng: 8.5622, hubType: "air", continent: "Europe" },
  { id: "hub-addis-ababa", name: "Addis Ababa Air Hub", lat: 8.9779, lng: 38.7993, hubType: "air", continent: "Africa" },

  // --- Hubs: orbital launch sites ---------------------------------------
  { id: "hub-kourou", name: "Kourou Space Launch Site", lat: 5.1611, lng: -52.6503, hubType: "space", continent: "SouthAmerica" },
  { id: "hub-baikonur", name: "Baikonur Cosmodrome", lat: 45.9646, lng: 63.305, hubType: "space", continent: "Asia" },
  { id: "hub-kennedy", name: "Kennedy Space Center", lat: 28.5729, lng: -80.649, hubType: "space", continent: "NorthAmerica" },
  { id: "hub-jiuquan", name: "Jiuquan Satellite Launch Center", lat: 40.9608, lng: 100.2914, hubType: "space", continent: "Asia" },
  { id: "hub-sriharikota", name: "Sriharikota Launch Site", lat: 13.7199, lng: 80.2304, hubType: "space", continent: "Asia" },

  // --- Hubs: humanitarian logistics depots (UNHRD network) --------------
  { id: "hub-nairobi", name: "Nairobi Regional Depot", lat: -1.2921, lng: 36.8219, hubType: "depot", continent: "Africa" },
  { id: "hub-brindisi", name: "Brindisi Global Logistics Depot", lat: 40.632, lng: 17.937, hubType: "depot", continent: "Europe" },
  { id: "hub-accra", name: "Accra Depot", lat: 5.6037, lng: -0.187, hubType: "depot", continent: "Africa" },
  { id: "hub-panama-city", name: "Panama City Depot", lat: 8.9824, lng: -79.5199, hubType: "depot", continent: "NorthAmerica" },
  { id: "hub-subang", name: "Subang Depot", lat: 3.1073, lng: 101.5951, hubType: "depot", continent: "Asia" },
  { id: "hub-las-palmas", name: "Las Palmas Depot", lat: 28.1235, lng: -15.4363, hubType: "depot", continent: "Africa" },

  // --- Hubs: floating ocean farms (docs/OCEAN_FARM.md) -------------------
  // Moved out to open ocean — no longer coast-hugging — but kept within
  // the same ocean basin as the real upwelling current each was
  // originally named for, for continuity's sake.
  { id: "hub-walvis-bay", name: "Walvis Bay Ocean Farm", lat: -28.0, lng: 2.0, hubType: "ocean_farm", continent: "Africa" }, // open South Atlantic, Benguela current basin
  { id: "hub-chimbote", name: "Chimbote Ocean Farm", lat: -14.0, lng: -102.0, hubType: "ocean_farm", continent: "SouthAmerica" }, // open South Pacific, Humboldt current basin
  { id: "hub-monterey", name: "Monterey Bay Ocean Farm", lat: 30.0, lng: -142.0, hubType: "ocean_farm", continent: "NorthAmerica" }, // open North Pacific, California current basin
  { id: "hub-dakhla", name: "Dakhla Ocean Farm", lat: 21.0, lng: -28.0, hubType: "ocean_farm", continent: "Africa" }, // open North Atlantic, Canary current basin
];

export const nodeById = new Map(nodes.map((n) => [n.id, n]));
