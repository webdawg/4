// Hub coordinates are real, publicly known locations (major sea ports, air
// cargo hubs, orbital launch sites, and the UN's UNHRD humanitarian depot
// network).
//
// This used to also include a hand-authored set of illustrative "need"
// regions with a fake 0-1 severity level, rendered as sprites on the
// globe. Those were removed — need/food-insecurity severity is now driven
// by real HDX HAPI data (public/data/food_security_admin1.json,
// public/data/food_security_current.json) rendered as a heatmap on the
// country/admin1 boundary polygons, not by sprites at all. See SPEC.md's
// "granular need heatmap" update for the full story of why.
export type HubType = "port" | "air" | "space" | "depot";

export interface DeliveryNode {
  id: string;
  name: string;
  lat: number;
  lng: number;
  hubType: HubType;
}

export const nodes: DeliveryNode[] = [
  // --- Hubs: sea ports -----------------------------------------------
  { id: "hub-rotterdam", name: "Rotterdam Port Hub", lat: 51.9225, lng: 4.47917, hubType: "port" },
  { id: "hub-singapore", name: "Singapore Port Hub", lat: 1.3521, lng: 103.8198, hubType: "port" },
  { id: "hub-shanghai", name: "Shanghai Port Hub", lat: 31.2304, lng: 121.4737, hubType: "port" },
  { id: "hub-los-angeles", name: "Los Angeles / Long Beach Port Hub", lat: 33.7701, lng: -118.1937, hubType: "port" },
  { id: "hub-santos", name: "Santos Port Hub", lat: -23.9608, lng: -46.3339, hubType: "port" },
  { id: "hub-mumbai", name: "Mumbai (JNPT) Port Hub", lat: 18.949, lng: 72.9525, hubType: "port" },
  { id: "hub-durban", name: "Durban Port Hub", lat: -29.8587, lng: 31.0218, hubType: "port" },

  // --- Hubs: air cargo -------------------------------------------------
  { id: "hub-miami", name: "Miami Air Hub", lat: 25.7617, lng: -80.1918, hubType: "air" },
  { id: "hub-dubai", name: "Dubai Air Hub", lat: 25.2048, lng: 55.2708, hubType: "air" },
  { id: "hub-memphis", name: "Memphis Air Hub", lat: 35.0424, lng: -89.9767, hubType: "air" },
  { id: "hub-hong-kong", name: "Hong Kong Air Hub", lat: 22.308, lng: 113.9185, hubType: "air" },
  { id: "hub-frankfurt", name: "Frankfurt Air Hub", lat: 50.0379, lng: 8.5622, hubType: "air" },
  { id: "hub-addis-ababa", name: "Addis Ababa Air Hub", lat: 8.9779, lng: 38.7993, hubType: "air" },

  // --- Hubs: orbital launch sites ---------------------------------------
  { id: "hub-kourou", name: "Kourou Space Launch Site", lat: 5.1611, lng: -52.6503, hubType: "space" },
  { id: "hub-baikonur", name: "Baikonur Cosmodrome", lat: 45.9646, lng: 63.305, hubType: "space" },
  { id: "hub-kennedy", name: "Kennedy Space Center", lat: 28.5729, lng: -80.649, hubType: "space" },
  { id: "hub-jiuquan", name: "Jiuquan Satellite Launch Center", lat: 40.9608, lng: 100.2914, hubType: "space" },
  { id: "hub-sriharikota", name: "Sriharikota Launch Site", lat: 13.7199, lng: 80.2304, hubType: "space" },

  // --- Hubs: humanitarian logistics depots (UNHRD network) --------------
  { id: "hub-nairobi", name: "Nairobi Regional Depot", lat: -1.2921, lng: 36.8219, hubType: "depot" },
  { id: "hub-brindisi", name: "Brindisi Global Logistics Depot", lat: 40.632, lng: 17.937, hubType: "depot" },
  { id: "hub-accra", name: "Accra Depot", lat: 5.6037, lng: -0.187, hubType: "depot" },
  { id: "hub-panama-city", name: "Panama City Depot", lat: 8.9824, lng: -79.5199, hubType: "depot" },
  { id: "hub-subang", name: "Subang Depot", lat: 3.1073, lng: 101.5951, hubType: "depot" },
  { id: "hub-las-palmas", name: "Las Palmas Depot", lat: 28.1235, lng: -15.4363, hubType: "depot" },
];

export const nodeById = new Map(nodes.map((n) => [n.id, n]));
