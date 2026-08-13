import type { DeliveryMode } from "./modes";

// Destinations used to be a lookup against hand-authored "need" nodes in
// nodes.ts; those were removed (need severity now comes from the real HDX
// heatmap, not illustrative points), so each route carries its own
// destination coordinates directly instead of a node id. Coordinates are
// the same illustrative points that used to live in nodes.ts.
export interface DeliveryRoute {
  id: string;
  from: string; // hub node id, see nodes.ts
  toLat: number;
  toLng: number;
  toName: string;
  mode: DeliveryMode;
}

export const routes: DeliveryRoute[] = [
  { id: "r-ship-sahel", from: "hub-rotterdam", toLat: 14.4974, toLng: -0.0999, toName: "Sahel Region", mode: "ship" },
  { id: "r-ship-horn", from: "hub-singapore", toLat: 8.9806, toLng: 42.5903, toName: "Horn of Africa", mode: "ship" },
  { id: "r-plane-yemen", from: "hub-dubai", toLat: 15.5527, toLng: 48.5164, toName: "Yemen", mode: "plane" },
  {
    id: "r-plane-south-sudan",
    from: "hub-nairobi",
    toLat: 6.877,
    toLng: 31.307,
    toName: "South Sudan",
    mode: "plane",
  },
  { id: "r-catapult-haiti", from: "hub-miami", toLat: 18.9712, toLng: -72.2852, toName: "Haiti", mode: "catapult" },
  {
    id: "r-space-afghanistan",
    from: "hub-baikonur",
    toLat: 33.9391,
    toLng: 67.71,
    toName: "Afghanistan",
    mode: "space",
  },
  {
    id: "r-space-pacific",
    from: "hub-kourou",
    toLat: -8.5,
    toLng: 179.2,
    toName: "Remote Pacific Community",
    mode: "space",
  },
  {
    id: "r-instructions-sahel",
    from: "hub-nairobi",
    toLat: 14.4974,
    toLng: -0.0999,
    toName: "Sahel Region",
    mode: "instructions",
  },
  {
    id: "r-instructions-pacific",
    from: "hub-singapore",
    toLat: -8.5,
    toLng: 179.2,
    toName: "Remote Pacific Community",
    mode: "instructions",
  },
];
