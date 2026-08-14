import type { Continent } from "./nodes";

// Autonomous drone launch/charging stations — see docs/DRONE_DELIVERY.md.
// Deliberately NOT a hub type in nodes.ts: stations are lightweight,
// numerous, and frequently not co-located with a major hub at all — the
// same architectural reason satellites aren't hubs either. Positioned
// within the drone's real ~120km one-way range of the specific
// hard-to-reach population each one serves; this is the mode explicitly
// designed to reach places closed borders or contested territory keep
// every other delivery mode out of, so "near a port" is not the siting
// logic here. `continent` is only used by the route generator to keep
// porter/drone last-mile hops geographically sane, not a load-bearing
// physical constraint the way it is for hubs.
export interface DroneStation {
  id: string;
  name: string;
  lat: number;
  lng: number;
  continent: Continent;
}

export const droneStations: DroneStation[] = [
  // International waters in the Yellow Sea, ~85km from the Pyongyang/
  // Nampo area — reaches into North Korea, a country with a
  // well-documented history of severe UN-reported famine, without
  // requiring a station (or permission) inside its border.
  { id: "station-yellow-sea", name: "Yellow Sea Forward Station", lat: 38.6, lng: 125.0, continent: "Asia" },
  // Central Afghanistan, ~70km from the Afghanistan need-region
  // coordinate already used elsewhere in this simulation's routes —
  // forward-deployed with no dependency on any port/air/depot hub.
  { id: "station-afghanistan-interior", name: "Afghanistan Interior Forward Station", lat: 34.2, lng: 68.3, continent: "Asia" },
  { id: "station-sahel", name: "Sahel Forward Station", lat: 14.8, lng: -0.5, continent: "Africa" },
  { id: "station-south-sudan", name: "South Sudan Forward Station", lat: 7.0, lng: 31.0, continent: "Africa" },
  // International waters/coastal Mediterranean off Gaza, same "reach
  // without requiring a station inside the border" logic as Yellow Sea.
  { id: "station-gaza", name: "Eastern Mediterranean Forward Station", lat: 31.7, lng: 34.0, continent: "Asia" },
  { id: "station-yemen", name: "Yemen Forward Station", lat: 15.3, lng: 48.0, continent: "Asia" },
  { id: "station-haiti", name: "Haiti Forward Station", lat: 19.0, lng: -72.5, continent: "NorthAmerica" },
];

export const droneStationById = new Map(droneStations.map((s) => [s.id, s]));
