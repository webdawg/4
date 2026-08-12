import type { DeliveryMode } from "./modes";

export interface DeliveryRoute {
  id: string;
  from: string; // node id
  to: string; // node id
  mode: DeliveryMode;
}

export const routes: DeliveryRoute[] = [
  { id: "r-ship-sahel", from: "hub-rotterdam", to: "need-sahel", mode: "ship" },
  { id: "r-ship-horn", from: "hub-singapore", to: "need-horn-of-africa", mode: "ship" },
  { id: "r-plane-yemen", from: "hub-dubai", to: "need-yemen", mode: "plane" },
  { id: "r-plane-south-sudan", from: "hub-nairobi", to: "need-south-sudan", mode: "plane" },
  { id: "r-catapult-haiti", from: "hub-miami", to: "need-haiti", mode: "catapult" },
  { id: "r-space-afghanistan", from: "hub-baikonur", to: "need-afghanistan", mode: "space" },
  { id: "r-space-pacific", from: "hub-kourou", to: "need-remote-pacific", mode: "space" },
  { id: "r-instructions-sahel", from: "hub-nairobi", to: "need-sahel", mode: "instructions" },
  { id: "r-instructions-pacific", from: "hub-singapore", to: "need-remote-pacific", mode: "instructions" },
];
