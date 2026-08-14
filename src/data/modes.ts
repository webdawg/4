// Delivery modalities the simulation can visualize.
// The mission is deliberately open-ended ("any cost", "anything") — new
// modes can be added here without touching rendering logic, as long as
// they get a style entry below.
export type DeliveryMode =
  | "space"
  | "plane"
  | "ship"
  | "catapult"
  | "drone"
  | "submarine"
  | "train"
  | "porter"
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
  /**
   * Real cruise speed in km/h — used to derive each route's actual travel
   * time from its real great-circle distance (see src/main.ts's moving-
   * object duration calc), instead of every route taking the same fixed
   * animation time regardless of how far it actually goes. Undefined for
   * "space" (its own satellite/capsule system, not the generic
   * moving-object path) and "instructions" (non-physical, no vehicle).
   */
  speedKmh?: number;
  /** Non-physical modes (e.g. broadcast knowledge) render as pulsing rings, not arcs. */
  isPhysical: boolean;
  /**
   * True for modes that are NOT general-purpose routing — reserved for
   * specific situations rather than freely assignable like the modes
   * below. Currently just "space": moving food via orbital deorbit is
   * real (SPACE_DELIVERY.md), but shouldn't be treated as an
   * interchangeable option alongside ship/plane/train/etc. — "we may
   * only move food using space in certain situations." What those
   * situations actually are is deliberately not decided yet (flagged
   * here, not designed here) — this field exists so that decision has
   * somewhere to attach later without another reorganization. Nothing
   * currently reads this flag to restrict behavior — everything already
   * built (including space routes/capsules/satellites) keeps running
   * exactly as-is until that follow-up design happens.
   */
  situational?: boolean;
}

// General-purpose modes: freely assignable by the route generator
// (src/data/routes.ts) between any hub/station whose type allows them,
// per the domain rules there. This is most of the mode set.
export const MODE_STYLES: Record<DeliveryMode, ModeStyle> = {
  plane: {
    label: "Air Freight / Airdrop",
    description: "Air hub to region, fixed-wing or airdrop.",
    color: ["#fbbf24", "#fef3c7"],
    altitude: 0.3,
    stroke: 0.5,
    speedKmh: 850, // typical cargo-aircraft cruise speed
    isPhysical: true,
  },
  ship: {
    label: "Sea Freight",
    description:
      "Autonomous solar-electric cargo vessel (~3,000-4,000 dwt, hydrogen fuel-cell buffered, no crew), hub-and-spoke network — see docs/AUTONOMOUS_TRANSPORT.md.",
    color: ["#34d399", "#a7f3d0"],
    altitude: 0.12,
    stroke: 0.45,
    speedKmh: 20, // ~11 knots, matches AUTONOMOUS_TRANSPORT.md's ~10-12 knot cruise
    isPhysical: true,
  },
  catapult: {
    label: "Catapult / Short-Range Launch",
    description: "Extreme short-range ballistic delivery for last-mile or blockade scenarios.",
    color: ["#f87171", "#fecaca"],
    altitude: 0.04,
    stroke: 0.7,
    speedKmh: 200, // nominal — ballistic, but "extreme short-range" by design (see MODE_MAX_RANGE_KM in routes.ts)
    isPhysical: true,
  },
  drone: {
    label: "Autonomous Electric Drone",
    description:
      "Small fixed-wing electric aircraft, solar-charged station launch, ~8kg payload / ~120km one-way, precision parachute drop — no landing, no runway, no permission needed. See docs/DRONE_DELIVERY.md.",
    color: ["#e879f9", "#f5d0fe"],
    altitude: 0.02,
    stroke: 0.5,
    speedKmh: 110,
    isPhysical: true,
  },
  // The three modes below (submarine/train/porter) are deliberately
  // shallow — attributes assigned to get them running now, not yet given
  // the full "decision, not a survey" design-doc treatment the other
  // modes got (docs/SPACE_DELIVERY.md, OCEAN_FARM.md,
  // AUTONOMOUS_TRANSPORT.md, DRONE_DELIVERY.md). See
  // docs/EXPANSION_MODES.md for what little is committed so far. Speeds
  // are deliberately derated ~10-20% below a naive real-world estimate
  // per an explicit user instruction, not a mistake if these read as
  // slower than expected.
  submarine: {
    label: "Autonomous Electric Submarine",
    description:
      "Submerged autonomous cargo transport — storm/interdiction-resilient alternative to surface shipping, also used for ocean-farm-to-surface and long-haul bulk routes. Shallow spec, science TBD.",
    color: ["#1e3a8a", "#60a5fa"],
    altitude: -0.05, // below the surface, unlike every other physical mode
    stroke: 0.45,
    speedKmh: 12.6, // ~6.8 knots cruise, derated from a naive ~8 knot estimate
    isPhysical: true,
  },
  train: {
    label: "Autonomous Electric Train",
    description:
      "Dual-mode rail vehicle — runs the rail network, then lowers a secondary drive system to continue short distances off-track. Shallow spec, science TBD.",
    color: ["#94a3b8", "#e2e8f0"],
    altitude: 0.015,
    stroke: 0.55,
    speedKmh: 59.5, // derated from a naive ~70 km/h estimate
    isPhysical: true,
  },
  porter: {
    label: "Human Porter",
    description:
      "People are part of the delivery network — foot-carried delivery for terrain nothing else in this system can reach. Slowest mode by design, not by oversight. Shallow spec, science TBD.",
    color: ["#b45309", "#fde68a"],
    altitude: 0.008,
    stroke: 0.4,
    speedKmh: 3.4, // loaded walking pace, derated from a naive ~4 km/h estimate
    isPhysical: true,
  },
  instructions: {
    label: "Knowledge Broadcast",
    description: "Non-physical delivery: farming/food-production knowledge transmitted to a region.",
    color: ["#c084fc", "#e9d5ff"],
    altitude: 0,
    stroke: 0,
    isPhysical: false,
  },

  // --- Situational-use modes -----------------------------------------
  // Not freely assignable the way everything above is — see the
  // `situational` field's doc comment. Still fully built and running
  // (satellite constellation, deorbit capsules, docs/SPACE_DELIVERY.md)
  // — separated here as a documentation/organization change only, not a
  // functional restriction, pending a follow-up conversation about what
  // "certain situations" actually means.
  space: {
    label: "Orbital / Space Drop",
    description: "Launch-site to re-entry drop zone delivery.",
    color: ["#7dd3fc", "#e0f2fe"],
    altitude: 0.55,
    stroke: 0.6,
    isPhysical: true,
    situational: true,
  },
};
