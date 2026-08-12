// Hub coordinates are real, publicly known locations (major sea ports, air
// cargo hubs, orbital launch sites, and the UN's UNHRD humanitarian depot
// network). "need" region severity levels are illustrative approximations
// of widely-reported humanitarian food-insecurity contexts (per public
// UN/WFP/IPC reporting patterns) — NOT sourced from any live feed, and not
// a precise or authoritative severity ranking.
export type HubType = "port" | "air" | "space" | "depot";

export interface DeliveryNode {
  id: string;
  name: string;
  lat: number;
  lng: number;
  kind: "hub" | "need";
  /** Only set for "hub" nodes. */
  hubType?: HubType;
  /** 0-1 severity, only set for "need" nodes. */
  needLevel?: number;
}

export const nodes: DeliveryNode[] = [
  // --- Hubs: sea ports -----------------------------------------------
  { id: "hub-rotterdam", name: "Rotterdam Port Hub", lat: 51.9225, lng: 4.47917, kind: "hub", hubType: "port" },
  { id: "hub-singapore", name: "Singapore Port Hub", lat: 1.3521, lng: 103.8198, kind: "hub", hubType: "port" },
  { id: "hub-shanghai", name: "Shanghai Port Hub", lat: 31.2304, lng: 121.4737, kind: "hub", hubType: "port" },
  { id: "hub-los-angeles", name: "Los Angeles / Long Beach Port Hub", lat: 33.7701, lng: -118.1937, kind: "hub", hubType: "port" },
  { id: "hub-santos", name: "Santos Port Hub", lat: -23.9608, lng: -46.3339, kind: "hub", hubType: "port" },
  { id: "hub-mumbai", name: "Mumbai (JNPT) Port Hub", lat: 18.949, lng: 72.9525, kind: "hub", hubType: "port" },
  { id: "hub-durban", name: "Durban Port Hub", lat: -29.8587, lng: 31.0218, kind: "hub", hubType: "port" },

  // --- Hubs: air cargo -------------------------------------------------
  { id: "hub-miami", name: "Miami Air Hub", lat: 25.7617, lng: -80.1918, kind: "hub", hubType: "air" },
  { id: "hub-dubai", name: "Dubai Air Hub", lat: 25.2048, lng: 55.2708, kind: "hub", hubType: "air" },
  { id: "hub-memphis", name: "Memphis Air Hub", lat: 35.0424, lng: -89.9767, kind: "hub", hubType: "air" },
  { id: "hub-hong-kong", name: "Hong Kong Air Hub", lat: 22.308, lng: 113.9185, kind: "hub", hubType: "air" },
  { id: "hub-frankfurt", name: "Frankfurt Air Hub", lat: 50.0379, lng: 8.5622, kind: "hub", hubType: "air" },
  { id: "hub-addis-ababa", name: "Addis Ababa Air Hub", lat: 8.9779, lng: 38.7993, kind: "hub", hubType: "air" },

  // --- Hubs: orbital launch sites ---------------------------------------
  { id: "hub-kourou", name: "Kourou Space Launch Site", lat: 5.1611, lng: -52.6503, kind: "hub", hubType: "space" },
  { id: "hub-baikonur", name: "Baikonur Cosmodrome", lat: 45.9646, lng: 63.305, kind: "hub", hubType: "space" },
  { id: "hub-kennedy", name: "Kennedy Space Center", lat: 28.5729, lng: -80.649, kind: "hub", hubType: "space" },
  { id: "hub-jiuquan", name: "Jiuquan Satellite Launch Center", lat: 40.9608, lng: 100.2914, kind: "hub", hubType: "space" },
  { id: "hub-sriharikota", name: "Sriharikota Launch Site", lat: 13.7199, lng: 80.2304, kind: "hub", hubType: "space" },

  // --- Hubs: humanitarian logistics depots (UNHRD network) --------------
  { id: "hub-nairobi", name: "Nairobi Regional Depot", lat: -1.2921, lng: 36.8219, kind: "hub", hubType: "depot" },
  { id: "hub-brindisi", name: "Brindisi Global Logistics Depot", lat: 40.632, lng: 17.937, kind: "hub", hubType: "depot" },
  { id: "hub-accra", name: "Accra Depot", lat: 5.6037, lng: -0.187, kind: "hub", hubType: "depot" },
  { id: "hub-panama-city", name: "Panama City Depot", lat: 8.9824, lng: -79.5199, kind: "hub", hubType: "depot" },
  { id: "hub-subang", name: "Subang Depot", lat: 3.1073, lng: 101.5951, kind: "hub", hubType: "depot" },
  { id: "hub-las-palmas", name: "Las Palmas Depot", lat: 28.1235, lng: -15.4363, kind: "hub", hubType: "depot" },

  // --- Need regions — illustrative severity levels ---------------------
  { id: "need-sahel", name: "Sahel Region", lat: 14.4974, lng: -0.0999, kind: "need", needLevel: 0.85 },
  { id: "need-horn-of-africa", name: "Horn of Africa", lat: 8.9806, lng: 42.5903, kind: "need", needLevel: 0.9 },
  { id: "need-yemen", name: "Yemen", lat: 15.5527, lng: 48.5164, kind: "need", needLevel: 0.9 },
  { id: "need-south-sudan", name: "South Sudan", lat: 6.877, lng: 31.307, kind: "need", needLevel: 0.88 },
  { id: "need-sudan-darfur", name: "Sudan (Darfur)", lat: 13.6259, lng: 25.3493, kind: "need", needLevel: 0.9 },
  { id: "need-gaza", name: "Gaza Strip", lat: 31.5017, lng: 34.4668, kind: "need", needLevel: 0.95 },
  { id: "need-haiti", name: "Haiti", lat: 18.9712, lng: -72.2852, kind: "need", needLevel: 0.75 },
  { id: "need-afghanistan", name: "Afghanistan", lat: 33.9391, lng: 67.71, kind: "need", needLevel: 0.8 },
  { id: "need-eastern-drc", name: "Eastern DR Congo", lat: -1.6591, lng: 29.2394, kind: "need", needLevel: 0.82 },
  { id: "need-northwest-syria", name: "Northwest Syria", lat: 35.9306, lng: 36.6339, kind: "need", needLevel: 0.78 },
  { id: "need-rakhine-myanmar", name: "Rakhine State, Myanmar", lat: 20.1497, lng: 92.8985, kind: "need", needLevel: 0.75 },
  { id: "need-madagascar-south", name: "Southern Madagascar", lat: -25.1739, lng: 46.0833, kind: "need", needLevel: 0.7 },
  { id: "need-remote-pacific", name: "Remote Pacific Community", lat: -8.5, lng: 179.2, kind: "need", needLevel: 0.5 },
];

export const nodeById = new Map(nodes.map((n) => [n.id, n]));
