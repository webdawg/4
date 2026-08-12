// Sample/illustrative data only — NOT live logistics or crisis data.
// "need" regions are widely-reported humanitarian food-insecurity contexts
// (per public UN/WFP reporting patterns) used here purely to demonstrate
// the visualization; they are not sourced from any live feed.
export interface DeliveryNode {
  id: string;
  name: string;
  lat: number;
  lng: number;
  kind: "hub" | "need";
  /** 0-1 severity, only set for "need" nodes. */
  needLevel?: number;
}

export const nodes: DeliveryNode[] = [
  // Hubs — ports, air hubs, launch sites, regional depots
  { id: "hub-rotterdam", name: "Rotterdam Port Hub", lat: 51.9225, lng: 4.47917, kind: "hub" },
  { id: "hub-singapore", name: "Singapore Port Hub", lat: 1.3521, lng: 103.8198, kind: "hub" },
  { id: "hub-miami", name: "Miami Air Hub", lat: 25.7617, lng: -80.1918, kind: "hub" },
  { id: "hub-dubai", name: "Dubai Air Hub", lat: 25.2048, lng: 55.2708, kind: "hub" },
  { id: "hub-kourou", name: "Kourou Space Launch Site", lat: 5.1611, lng: -52.6503, kind: "hub" },
  { id: "hub-baikonur", name: "Baikonur Cosmodrome", lat: 45.9646, lng: 63.305, kind: "hub" },
  { id: "hub-nairobi", name: "Nairobi Regional Depot", lat: -1.2921, lng: 36.8219, kind: "hub" },

  // Need regions — illustrative severity levels
  { id: "need-sahel", name: "Sahel Region", lat: 14.4974, lng: -0.0999, kind: "need", needLevel: 0.85 },
  { id: "need-horn-of-africa", name: "Horn of Africa", lat: 8.9806, lng: 42.5903, kind: "need", needLevel: 0.9 },
  { id: "need-yemen", name: "Yemen", lat: 15.5527, lng: 48.5164, kind: "need", needLevel: 0.9 },
  { id: "need-south-sudan", name: "South Sudan", lat: 6.877, lng: 31.307, kind: "need", needLevel: 0.88 },
  { id: "need-haiti", name: "Haiti", lat: 18.9712, lng: -72.2852, kind: "need", needLevel: 0.75 },
  { id: "need-afghanistan", name: "Afghanistan", lat: 33.9391, lng: 67.71, kind: "need", needLevel: 0.8 },
  { id: "need-remote-pacific", name: "Remote Pacific Community", lat: -8.5, lng: 179.2, kind: "need", needLevel: 0.5 },
];

export const nodeById = new Map(nodes.map((n) => [n.id, n]));
