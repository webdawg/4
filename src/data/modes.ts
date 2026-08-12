// Delivery modalities the simulation can visualize.
// The mission is deliberately open-ended ("any cost", "anything") — new
// modes can be added here without touching rendering logic, as long as
// they get a style entry below.
export type DeliveryMode =
  | "space"
  | "plane"
  | "ship"
  | "catapult"
  | "instructions";

export interface ModeStyle {
  label: string;
  description: string;
  /** Arc gradient (start/end color) for physical routes. */
  color: [string, string];
  /** Arc apex height as a fraction of globe radius. Higher = more "space-like". */
  altitude: number;
  /** Arc line thickness. */
  stroke: number;
  /** Ms for one dash animation cycle along the arc — lower = faster travel. */
  dashDuration: number;
  /** Non-physical modes (e.g. broadcast knowledge) render as pulsing rings, not arcs. */
  isPhysical: boolean;
}

export const MODE_STYLES: Record<DeliveryMode, ModeStyle> = {
  space: {
    label: "Orbital / Space Drop",
    description: "Launch-site to re-entry drop zone delivery.",
    color: ["#7dd3fc", "#e0f2fe"],
    altitude: 0.55,
    stroke: 0.6,
    dashDuration: 1800,
    isPhysical: true,
  },
  plane: {
    label: "Air Freight / Airdrop",
    description: "Air hub to region, fixed-wing or airdrop.",
    color: ["#fbbf24", "#fef3c7"],
    altitude: 0.3,
    stroke: 0.5,
    dashDuration: 2600,
    isPhysical: true,
  },
  ship: {
    label: "Sea Freight",
    description: "Port hub to coastal region, bulk shipping.",
    color: ["#34d399", "#a7f3d0"],
    altitude: 0.12,
    stroke: 0.45,
    dashDuration: 5000,
    isPhysical: true,
  },
  catapult: {
    label: "Catapult / Short-Range Launch",
    description: "Extreme short-range ballistic delivery for last-mile or blockade scenarios.",
    color: ["#f87171", "#fecaca"],
    altitude: 0.04,
    stroke: 0.7,
    dashDuration: 700,
    isPhysical: true,
  },
  instructions: {
    label: "Knowledge Broadcast",
    description: "Non-physical delivery: farming/food-production knowledge transmitted to a region.",
    color: ["#c084fc", "#e9d5ff"],
    altitude: 0,
    stroke: 0,
    dashDuration: 0,
    isPhysical: false,
  },
};
