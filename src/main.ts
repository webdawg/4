import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import ThreeGlobe from "three-globe";
import { nodes, nodeById, type DeliveryNode } from "./data/nodes";
import { routes } from "./data/routes";
import { MODE_STYLES, type DeliveryMode } from "./data/modes";
import { buildLineShape, type LineShapeKind } from "./lineShapes";
import "./style.css";

// Toggle: show/hide the distribution routes (arcs, moving delivery
// objects, knowledge-broadcast rings, orbital constellation + deorbit
// capsules). Flip to `false` to go back to a bare hub-network globe. See
// SPEC.md "Distribution routes toggle" for details.
const SHOW_DISTRIBUTION_ROUTES = true;

const app = document.querySelector<HTMLDivElement>("#app")!;
app.innerHTML = `<canvas id="globe-canvas"></canvas>`;

const canvas = document.querySelector<HTMLCanvasElement>("#globe-canvas")!;

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new THREE.Scene();
scene.add(new THREE.AmbientLight(0xffffff, Math.PI));
const sunLight = new THREE.DirectionalLight(0xffffff, 1.2);
sunLight.position.set(5, 3, 5);
scene.add(sunLight);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 2000);
camera.position.set(0, 0, 350);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 101; // globe radius is 100 — lets the camera get down to ground level
controls.maxDistance = 800;
controls.rotateSpeed = 0.4;
controls.zoomSpeed = 0.7;

// --- Globe -----------------------------------------------------------

const physicalRoutes = SHOW_DISTRIBUTION_ROUTES ? routes.filter((r) => MODE_STYLES[r.mode].isPhysical) : [];
const instructionRoutes = SHOW_DISTRIBUTION_ROUTES ? routes.filter((r) => !MODE_STYLES[r.mode].isPhysical) : [];

// "space" routes get a dedicated orbital-constellation + deorbit-capsule
// visualization (see below, per docs/SPACE_DELIVERY.md) instead of a
// direct hub-to-need arc — food isn't shipped straight from a launch site
// to a need region, it's grown in orbit and dropped. Everything else
// (ship/plane/catapult) keeps the generic arc + moving-object treatment.
const surfaceRoutes = physicalRoutes.filter((r) => r.mode !== "space");
const spaceRoutes = physicalRoutes.filter((r) => r.mode === "space");

interface ArcDatum {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  color: [string, string];
  altitude: number;
  stroke: number;
  dashDuration: number;
  mode: DeliveryMode;
  fromName: string;
  toName: string;
}

const arcsData: ArcDatum[] = surfaceRoutes.map((r) => {
  const from = nodeById.get(r.from)!;
  const to = nodeById.get(r.to)!;
  const style = MODE_STYLES[r.mode];
  return {
    startLat: from.lat,
    startLng: from.lng,
    endLat: to.lat,
    endLng: to.lng,
    color: style.color,
    altitude: style.altitude,
    stroke: style.stroke,
    dashDuration: style.dashDuration,
    mode: r.mode,
    fromName: from.name,
    toName: to.name,
  };
});

interface RingDatum {
  lat: number;
  lng: number;
  color: string;
  mode: DeliveryMode;
  nodeName: string;
}

// Knowledge-broadcast routes render as pulsing rings on the destination
// (non-physical delivery has no path to draw).
const instructionTargets = new Map<string, DeliveryMode>();
for (const r of instructionRoutes) instructionTargets.set(r.to, r.mode);
const ringsData: RingDatum[] = [...instructionTargets.entries()].map(([nodeId, mode]) => {
  const node = nodeById.get(nodeId)!;
  const style = MODE_STYLES[mode];
  return {
    lat: node.lat,
    lng: node.lng,
    color: style.color[0],
    mode,
    nodeName: node.name,
  };
});

const HUB_TYPE_COLORS: Record<string, string> = {
  port: "#38bdf8",
  air: "#fbbf24",
  space: "#a78bfa",
  depot: "#2dd4bf",
};

const HUB_TYPE_LABELS: Record<string, string> = {
  port: "Sea Port",
  air: "Air Cargo Hub",
  space: "Launch Site",
  depot: "Humanitarian Depot",
};

// Every hub type gets its own line-intersection shape family (see
// src/lineShapes.ts); need-regions all use star12, distinguished by color
// and arm length (severity) instead of a separate shape.
const HUB_TYPE_SHAPES: Record<string, LineShapeKind> = {
  port: "cross6",
  air: "tetraX",
  space: "star12",
  depot: "cubeStar",
};

function getPointColor(node: DeliveryNode): string {
  if (node.kind === "hub") return HUB_TYPE_COLORS[node.hubType ?? "port"];
  const level = node.needLevel ?? 0.5;
  // Interpolate amber -> red as need severity rises.
  return level > 0.8 ? "#ef4444" : level > 0.6 ? "#f97316" : "#f59e0b";
}

// No photographic texture — the globe surface itself follows the
// line-intersection aesthetic: a plain dark sphere with real country
// boundaries drawn as vector lines (see COUNTRY_BORDER_COLOR below),
// not a raster "skin".
const GLOBE_SURFACE_COLOR = 0x0b1220;
const COUNTRY_BORDER_COLOR = "#38bdf8";

const globe = new ThreeGlobe()
  .globeMaterial(
    new THREE.MeshPhongMaterial({
      color: GLOBE_SURFACE_COLOR,
      emissive: GLOBE_SURFACE_COLOR,
      emissiveIntensity: 0.25,
      shininess: 4,
    }),
  )
  .showAtmosphere(true)
  .atmosphereColor("#60a5fa")
  .atmosphereAltitude(0.18)
  .arcsData(arcsData)
  .arcColor("color")
  .arcAltitude("altitude")
  .arcStroke("stroke")
  .arcDashLength(0.4)
  .arcDashGap(0.2)
  .arcDashAnimateTime("dashDuration")
  .ringsData(ringsData)
  .ringColor((d: object) => {
    const c = new THREE.Color((d as { color: string }).color);
    return (t: number) => `rgba(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)},${1 - t})`;
  })
  .ringMaxRadius(4)
  .ringPropagationSpeed(2)
  .ringRepeatPeriod(1400);

scene.add(globe);

// --- Country boundaries + names -------------------------------------------
// Real political boundaries (Natural Earth 110m admin-0 countries,
// bundled in public/data/ so it loads with no external dependency at
// runtime), rendered as vector outlines rather than baked into a texture —
// fill is nearly transparent so the boundary lines are what read, not solid
// country shapes. Country names are placed at each country's largest-ring
// centroid.

type GeoRing = number[][]; // [lng, lat] points
type GeoPolygon = GeoRing[]; // outer ring + hole rings

interface CountryFeature {
  properties: { NAME: string; ISO_A3: string };
  geometry: { type: "Polygon" | "MultiPolygon"; coordinates: GeoPolygon | GeoPolygon[] };
}

interface CountryFeatureCollection {
  features: CountryFeature[];
}

interface CountryLabelDatum {
  lat: number;
  lng: number;
  name: string;
}

// --- Food security heatmap ------------------------------------------------
// Derived from HDX HAPI's Food Security dataset
// (https://data.humdata.org/dataset/hdx-hapi-food-security), via
// scripts/build_food_security_data.py — see that script for how the raw
// ~425k-row CSV in source_data/ becomes this ~50-country, latest-period-only
// snapshot. Keyed by ISO3, matching the boundary geojson's ISO_A3 property.

interface FoodSecurityPhase {
  label: string;
  population: number;
  fraction: number;
}

interface FoodSecurityRecord {
  periodStart: string;
  periodEnd: string;
  populationAnalyzed: number;
  phase3PlusFraction: number | null;
  phase3PlusPopulation: number | null;
  phases: Record<string, FoodSecurityPhase>;
}

interface FoodSecurityDataset {
  source: string;
  sourceUrl: string;
  countries: Record<string, FoodSecurityRecord>;
}

// Populated once /data/food_security_current.json loads; describeSelection
// (defined further down) reads this by closing over the variable, not the
// value, so it sees the populated map once the fetch resolves.
let foodSecurityByIso3 = new Map<string, FoodSecurityRecord>();

const NO_DATA_FILL = "rgba(56, 189, 248, 0.025)";

// IPC-style severity ramp (green -> yellow -> orange -> red -> maroon),
// keyed on the Phase-3-or-worse ("Crisis or worse") population fraction.
// Fill opacity rises with severity too, so untouched/no-data countries
// stay closest to the original near-transparent boundary look.
const HEATMAP_COLOR_STOPS: Array<[number, THREE.Color]> = [
  [0, new THREE.Color(0x16a34a)],
  [0.15, new THREE.Color(0xeab308)],
  [0.3, new THREE.Color(0xf97316)],
  [0.5, new THREE.Color(0xdc2626)],
  [0.75, new THREE.Color(0x7f1d1d)],
];

function foodSecurityFillColor(fraction: number): string {
  const t = Math.min(1, Math.max(0, fraction));
  let lower = HEATMAP_COLOR_STOPS[0];
  let upper = HEATMAP_COLOR_STOPS[HEATMAP_COLOR_STOPS.length - 1];
  for (let i = 0; i < HEATMAP_COLOR_STOPS.length - 1; i++) {
    if (t >= HEATMAP_COLOR_STOPS[i][0] && t <= HEATMAP_COLOR_STOPS[i + 1][0]) {
      lower = HEATMAP_COLOR_STOPS[i];
      upper = HEATMAP_COLOR_STOPS[i + 1];
      break;
    }
  }
  const span = upper[0] - lower[0] || 1;
  const localT = (t - lower[0]) / span;
  const color = lower[1].clone().lerp(upper[1], localT);
  const opacity = 0.18 + t * 0.55;
  return `rgba(${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)}, ${opacity.toFixed(3)})`;
}

// Shoelace-formula centroid + area of a single ring, in lng/lat space —
// approximate (doesn't account for spherical curvature), fine for label
// placement at this globe's scale.
function ringCentroid(ring: GeoRing): { lat: number; lng: number; area: number } {
  let signedArea = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [x0, y0] = ring[i];
    const [x1, y1] = ring[i + 1];
    const cross = x0 * y1 - x1 * y0;
    signedArea += cross;
    cx += (x0 + x1) * cross;
    cy += (y0 + y1) * cross;
  }
  signedArea *= 0.5;
  if (signedArea === 0) {
    const [lng, lat] = ring[0];
    return { lat, lng, area: 0 };
  }
  cx /= 6 * signedArea;
  cy /= 6 * signedArea;
  return { lat: cy, lng: cx, area: Math.abs(signedArea) };
}

// For MultiPolygon countries (e.g. archipelagos, countries with overseas
// territories), use the centroid of the largest landmass rather than
// averaging every part — otherwise the label lands in open ocean between
// disconnected pieces.
function countryCentroid(geometry: CountryFeature["geometry"]): { lat: number; lng: number } {
  const polygons: GeoPolygon[] = geometry.type === "Polygon" ? [geometry.coordinates as GeoPolygon] : (geometry.coordinates as GeoPolygon[]);
  let best: { lat: number; lng: number; area: number } | null = null;
  for (const polygon of polygons) {
    const centroid = ringCentroid(polygon[0]);
    if (!best || centroid.area > best.area) best = centroid;
  }
  return best ?? { lat: 0, lng: 0 };
}

Promise.all([
  fetch("/data/ne_110m_admin_0_countries.geojson").then((res) => res.json() as Promise<CountryFeatureCollection>),
  fetch("/data/food_security_current.json").then((res) => res.json() as Promise<FoodSecurityDataset>),
]).then(([countries, foodSecurity]) => {
  foodSecurityByIso3 = new Map(Object.entries(foodSecurity.countries));

  const labelsData: CountryLabelDatum[] = countries.features.map((feature) => {
    const { lat, lng } = countryCentroid(feature.geometry);
    return { lat, lng, name: feature.properties.NAME };
  });

  globe
    .polygonsData(countries.features)
    .polygonCapColor((d) => {
      const record = foodSecurityByIso3.get((d as CountryFeature).properties.ISO_A3);
      return record?.phase3PlusFraction != null ? foodSecurityFillColor(record.phase3PlusFraction) : NO_DATA_FILL;
    })
    .polygonSideColor(() => "rgba(0, 0, 0, 0)")
    .polygonStrokeColor(() => COUNTRY_BORDER_COLOR)
    .polygonAltitude(0.003)
    .labelsData(labelsData)
    .labelLat("lat")
    .labelLng("lng")
    .labelText("name")
    .labelSize(0.42)
    .labelColor(() => "rgba(148, 197, 232, 0.85)")
    .labelIncludeDot(false)
    .labelAltitude(0.008)
    .labelResolution(2);
});

// --- Hub / need-region markers ------------------------------------------
// Rendered as custom line-intersection shapes (src/lineShapes.ts) rather
// than three-globe's built-in solid point dots — every sprite in this scene
// is a set of lines radiating from a single point in space.

function buildNodeMarker(node: DeliveryNode): THREE.Object3D {
  const isHub = node.kind === "hub";
  const shape: LineShapeKind = isHub ? HUB_TYPE_SHAPES[node.hubType ?? "port"] : "star12";
  const size = isHub ? 1.8 : 1.6 + (node.needLevel ?? 0.5) * 2.4;
  const marker = buildLineShape(shape, size, getPointColor(node));
  marker.userData.selectableType = "node";
  marker.userData.selectableData = node;
  return marker;
}

for (const node of nodes) {
  const altitudeFrac = node.kind === "hub" ? 0.012 : 0.02;
  const coords = globe.getCoords(node.lat, node.lng, altitudeFrac);
  const marker = buildNodeMarker(node);
  marker.position.set(coords.x, coords.y, coords.z);
  globe.add(marker);
}

// --- Moving delivery objects --------------------------------------------
// One mesh per physical route, traveling repeatedly along a curve that
// mirrors the arc's start/end/altitude. Shape distinguishes the mode;
// non-directional geometry is used deliberately since it reads correctly
// from any camera angle without per-frame orientation logic.

const GLOBE_RADIUS = globe.getGlobeRadius();

function buildArcCurve(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number,
  altitudeFrac: number,
): THREE.QuadraticBezierCurve3 {
  const s = globe.getCoords(startLat, startLng, 0);
  const e = globe.getCoords(endLat, endLng, 0);
  const start = new THREE.Vector3(s.x, s.y, s.z);
  const end = new THREE.Vector3(e.x, e.y, e.z);
  const mid = start
    .clone()
    .add(end)
    .multiplyScalar(0.5)
    .normalize()
    .multiplyScalar(GLOBE_RADIUS * (1 + altitudeFrac));
  return new THREE.QuadraticBezierCurve3(start, mid, end);
}

// Each delivery mode gets its own line-shape family (src/lineShapes.ts):
// ship = 3D cross, plane = 8-arm diamond spread, catapult = sharp 4-arm X,
// space = dense 12-arm star. Non-directional by construction, so it reads
// correctly from any camera angle with no per-frame orientation logic.
const MODE_SHAPES: Record<DeliveryMode, LineShapeKind> = {
  ship: "cross6",
  plane: "cubeStar",
  catapult: "tetraX",
  space: "star12",
  instructions: "cross6", // unused: instructions is non-physical, renders as rings only
};

function makeModeMesh(mode: DeliveryMode): THREE.Object3D {
  const style = MODE_STYLES[mode];
  return buildLineShape(MODE_SHAPES[mode], 2.2, style.color[0]);
}

interface MovingObject {
  curve: THREE.QuadraticBezierCurve3;
  mesh: THREE.Object3D;
  durationMs: number;
  offsetMs: number;
}

const movingObjects: MovingObject[] = surfaceRoutes.map((r, i) => {
  const from = nodeById.get(r.from)!;
  const to = nodeById.get(r.to)!;
  const style = MODE_STYLES[r.mode];
  const curve = buildArcCurve(from.lat, from.lng, to.lat, to.lng, style.altitude);
  const mesh = makeModeMesh(r.mode);
  mesh.userData.selectableType = "moving";
  mesh.userData.selectableData = { mode: r.mode, fromName: from.name, toName: to.name };
  globe.add(mesh);
  return {
    curve,
    mesh,
    durationMs: style.dashDuration,
    offsetMs: (i / surfaceRoutes.length) * style.dashDuration,
  };
});

// --- Orbital constellation + deorbit capsules (space delivery) ---------
// Physical system design: docs/SPACE_DELIVERY.md. A small fleet of
// platforms in continuously-lit orbit, each following a simplified
// circular orbit (inclination + RAAN + phase), periodically "dropping" a
// capsule from whichever satellite is currently nearest the target toward
// the `need` node coordinates already defined for each `space` route.

const ORBIT_ALTITUDE = MODE_STYLES.space.altitude;
const ORBIT_RADIUS = GLOBE_RADIUS * (1 + ORBIT_ALTITUDE);
const SATELLITE_COUNT = 8;

interface Satellite {
  mesh: THREE.Object3D;
  inclination: number;
  raan: number;
  phase0: number;
  angularSpeed: number; // radians per ms
}

function makeSatelliteMesh(): THREE.Object3D {
  return buildLineShape("star12", 2.6, 0xcbd5e1);
}

function satellitePosition(sat: Satellite, elapsedMs: number): THREE.Vector3 {
  const theta = sat.phase0 + sat.angularSpeed * elapsedMs;
  const cosT = Math.cos(theta);
  const sinT = Math.sin(theta);
  const cosI = Math.cos(sat.inclination);
  const sinI = Math.sin(sat.inclination);
  const cosR = Math.cos(sat.raan);
  const sinR = Math.sin(sat.raan);
  // In-plane circular orbit, then tilt by inclination and spread by RAAN
  // around the polar (Y) axis — a simplified circular-orbit parametrization,
  // not a physically exact ephemeris.
  const y1 = sinT * cosI;
  const z1 = sinT * sinI;
  const x = cosT * cosR - z1 * sinR;
  const z = cosT * sinR + z1 * cosR;
  return new THREE.Vector3(x, y1, z).multiplyScalar(ORBIT_RADIUS);
}

const satellites: Satellite[] = SHOW_DISTRIBUTION_ROUTES
  ? Array.from({ length: SATELLITE_COUNT }, (_, i) => {
      const mesh = makeSatelliteMesh();
      mesh.userData.selectableType = "satellite";
      mesh.userData.selectableData = { index: i };
      globe.add(mesh);
      return {
        mesh,
        inclination: Math.PI / 6 + (i % 4) * (Math.PI / 8),
        raan: (i / SATELLITE_COUNT) * Math.PI * 2,
        phase0: (i / SATELLITE_COUNT) * Math.PI * 2 * 1.618,
        angularSpeed: (Math.PI * 2) / (20000 + (i % 3) * 4000),
      };
    })
  : [];

// Resupply beams: a faint line from each space-hub launch site straight up
// to orbital altitude, representing the nutrient/water/propellant/spare-part
// resupply flights described in docs/SPACE_DELIVERY.md.
const spaceHubs = nodes.filter((n) => n.kind === "hub" && n.hubType === "space");
if (SHOW_DISTRIBUTION_ROUTES) {
  for (const hub of spaceHubs) {
    const g = globe.getCoords(hub.lat, hub.lng, 0);
    const ground = new THREE.Vector3(g.x, g.y, g.z);
    const sky = ground.clone().normalize().multiplyScalar(ORBIT_RADIUS);
    const geometry = new THREE.BufferGeometry().setFromPoints([ground, sky]);
    const material = new THREE.LineBasicMaterial({ color: 0xa78bfa, transparent: true, opacity: 0.3 });
    const beam = new THREE.Line(geometry, material);
    beam.userData.selectableType = "beam";
    beam.userData.selectableData = { hubName: hub.name };
    globe.add(beam);
  }
}

interface CapsuleSpawner {
  targetLat: number;
  targetLng: number;
  targetName: string;
  cadenceMs: number;
  nextLaunchMs: number;
  durationMs: number;
}

const capsuleSpawners: CapsuleSpawner[] = spaceRoutes.map((r, i) => {
  const to = nodeById.get(r.to)!;
  return {
    targetLat: to.lat,
    targetLng: to.lng,
    targetName: to.name,
    cadenceMs: 9000,
    nextLaunchMs: 2000 + i * 3000,
    durationMs: 3000,
  };
});

interface ActiveCapsule {
  mesh: THREE.Object3D;
  curve: THREE.QuadraticBezierCurve3;
  startMs: number;
  durationMs: number;
}

const activeCapsules: ActiveCapsule[] = [];

function nearestSatellitePosition(targetPos: THREE.Vector3, elapsedMs: number): THREE.Vector3 {
  let best = new THREE.Vector3(0, ORBIT_RADIUS, 0);
  let bestDistSq = Infinity;
  for (const sat of satellites) {
    const pos = satellitePosition(sat, elapsedMs);
    const distSq = pos.distanceToSquared(targetPos);
    if (distSq < bestDistSq) {
      bestDistSq = distSq;
      best = pos;
    }
  }
  return best;
}

function spawnCapsule(spawner: CapsuleSpawner, elapsedMs: number) {
  const g = globe.getCoords(spawner.targetLat, spawner.targetLng, 0);
  const target = new THREE.Vector3(g.x, g.y, g.z);
  const launch = nearestSatellitePosition(target, elapsedMs);
  const mid = launch.clone().add(target).multiplyScalar(0.5);
  const curve = new THREE.QuadraticBezierCurve3(launch, mid, target);
  const mesh = buildLineShape("tetraX", 1.6, 0x7dd3fc);
  mesh.userData.selectableType = "capsule";
  mesh.userData.selectableData = {
    targetName: spawner.targetName,
    targetLat: spawner.targetLat,
    targetLng: spawner.targetLng,
    startMs: elapsedMs,
    durationMs: spawner.durationMs,
  };
  globe.add(mesh);
  activeCapsules.push({ mesh, curve, startMs: elapsedMs, durationMs: spawner.durationMs });
}

// --- Resize + render loop ---------------------------------------------

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const clock = new THREE.Clock();
let latestElapsedMs = 0;

renderer.setAnimationLoop(() => {
  const elapsedMs = clock.getElapsedTime() * 1000;
  latestElapsedMs = elapsedMs;

  for (const obj of movingObjects) {
    const t = ((elapsedMs + obj.offsetMs) % obj.durationMs) / obj.durationMs;
    obj.mesh.position.copy(obj.curve.getPoint(t));
  }

  for (const sat of satellites) {
    sat.mesh.position.copy(satellitePosition(sat, elapsedMs));
  }

  for (const spawner of capsuleSpawners) {
    if (elapsedMs >= spawner.nextLaunchMs) {
      spawnCapsule(spawner, elapsedMs);
      spawner.nextLaunchMs = elapsedMs + spawner.cadenceMs;
    }
  }

  for (let i = activeCapsules.length - 1; i >= 0; i--) {
    const capsule = activeCapsules[i];
    const t = (elapsedMs - capsule.startMs) / capsule.durationMs;
    if (t >= 1) {
      globe.remove(capsule.mesh);
      activeCapsules.splice(i, 1);
      continue;
    }
    capsule.mesh.position.copy(capsule.curve.getPoint(t));
  }

  controls.update();
  renderer.render(scene, camera);
});

buildLegend();

// --- Legend overlay -----------------------------------------------------

function buildLegend() {
  const legend = document.createElement("div");
  legend.id = "legend";

  const hubRows = Object.entries(HUB_TYPE_LABELS)
    .map(
      ([type, label]) =>
        `<div class="legend-row"><span class="swatch" style="background:${HUB_TYPE_COLORS[type]}"></span>${label}</div>`,
    )
    .join("");

  const routeRows = SHOW_DISTRIBUTION_ROUTES
    ? Object.entries(MODE_STYLES)
        .map(
          ([, style]) =>
            `<div class="legend-row"><span class="swatch" style="background:${style.color[0]}"></span>${style.label}</div>`,
        )
        .join("")
    : "";

  const foodSecurityLabels = ["Low", "Elevated", "High", "Severe", "Catastrophic"];
  const foodSecurityRows = HEATMAP_COLOR_STOPS.map(
    ([, color], i) =>
      `<div class="legend-row"><span class="swatch" style="background:#${color.getHexString()}"></span>${foodSecurityLabels[i] ?? ""}</div>`,
  ).join("");

  legend.innerHTML = `
    <h1>Food Relief Network</h1>
    <p class="tagline">Click anything on the globe to inspect it.</p>
    ${hubRows}
    ${routeRows}
    <div class="legend-heading">Food insecurity (Crisis+ share)</div>
    ${foodSecurityRows}
  `;
  document.body.appendChild(legend);
}

// --- Selection / info panel -----------------------------------------------
// Click any point, arc, ring, moving object, satellite, capsule, or
// resupply beam to see structured information about it. three-globe
// attaches the original datum (`__data`) and a type tag
// (`__globeObjType`) to every mesh it generates for points/arcs/rings —
// this reuses that instead of re-implementing point/arc rendering just to
// make them clickable. Custom objects (satellites, moving objects,
// capsules, resupply beams) carry the same information via `.userData`.

interface SelectionInfo {
  title: string;
  subtitle?: string;
  rows: Array<[string, string]>;
}

interface GlobeObjectExtras {
  __globeObjType?: string;
  __data?: unknown;
}

type SelectableHit =
  | { type: "node"; data: DeliveryNode }
  | { type: "arc"; data: ArcDatum }
  | { type: "ring"; data: RingDatum }
  | { type: "moving"; data: { mode: DeliveryMode; fromName: string; toName: string } }
  | { type: "satellite"; data: { index: number } }
  | {
      type: "capsule";
      data: { targetName: string; targetLat: number; targetLng: number; startMs: number; durationMs: number };
    }
  | { type: "beam"; data: { hubName: string } }
  | { type: "country"; data: CountryFeature };

function resolveSelectable(object: THREE.Object3D): SelectableHit | null {
  let obj: THREE.Object3D | null = object;
  while (obj && obj !== globe) {
    const userType = obj.userData?.selectableType as SelectableHit["type"] | undefined;
    if (userType) {
      return { type: userType, data: obj.userData.selectableData } as SelectableHit;
    }
    const extras = obj as unknown as GlobeObjectExtras;
    if (extras.__data !== undefined) {
      if (extras.__globeObjType === "arc") return { type: "arc", data: extras.__data as ArcDatum };
      if (extras.__globeObjType === "ring") return { type: "ring", data: extras.__data as RingDatum };
      if (extras.__globeObjType === "polygon") return { type: "country", data: extras.__data as CountryFeature };
    }
    obj = obj.parent;
  }
  return null;
}

function describeSelection(hit: SelectableHit): SelectionInfo {
  switch (hit.type) {
    case "node": {
      const node = hit.data;
      if (node.kind === "hub") {
        const typeLabel = HUB_TYPE_LABELS[node.hubType ?? "port"];
        return {
          title: node.name,
          subtitle: typeLabel,
          rows: [
            ["Type", typeLabel],
            ["Coordinates", `${node.lat.toFixed(2)}, ${node.lng.toFixed(2)}`],
          ],
        };
      }
      return {
        title: node.name,
        subtitle: "Need region",
        rows: [
          ["Need severity", `${Math.round((node.needLevel ?? 0.5) * 100)}%`],
          ["Coordinates", `${node.lat.toFixed(2)}, ${node.lng.toFixed(2)}`],
        ],
      };
    }
    case "arc": {
      const arc = hit.data;
      const style = MODE_STYLES[arc.mode];
      return {
        title: `${arc.fromName} → ${arc.toName}`,
        subtitle: style.label,
        rows: [["Description", style.description]],
      };
    }
    case "ring": {
      const ring = hit.data;
      const style = MODE_STYLES[ring.mode];
      return {
        title: ring.nodeName,
        subtitle: style.label,
        rows: [["Description", style.description]],
      };
    }
    case "moving": {
      const { mode, fromName, toName } = hit.data;
      const style = MODE_STYLES[mode];
      return {
        title: `${fromName} → ${toName}`,
        subtitle: `${style.label} (in transit)`,
        rows: [["Description", style.description]],
      };
    }
    case "satellite": {
      const sat = satellites[hit.data.index];
      const pos = sat ? satellitePosition(sat, latestElapsedMs) : new THREE.Vector3();
      return {
        title: `Orbital Platform ${hit.data.index + 1}`,
        subtitle: "Autonomous food-growing satellite",
        rows: [
          ["Orbit", "Dawn-dusk sun-synchronous LEO"],
          ["Altitude", `${(ORBIT_ALTITUDE * 100).toFixed(0)}% of globe radius (sim scale)`],
          ["Inclination", sat ? `${(sat.inclination * (180 / Math.PI)).toFixed(0)}°` : "—"],
          ["Position (sim coords)", `${pos.x.toFixed(0)}, ${pos.y.toFixed(0)}, ${pos.z.toFixed(0)}`],
          ["Design reference", "docs/SPACE_DELIVERY.md"],
        ],
      };
    }
    case "capsule": {
      const { targetName, startMs, durationMs } = hit.data;
      const progress = Math.min(1, Math.max(0, (latestElapsedMs - startMs) / durationMs));
      return {
        title: "Deorbit Capsule",
        subtitle: `→ ${targetName}`,
        rows: [
          ["Target", targetName],
          ["Reentry progress", `${Math.round(progress * 100)}%`],
          ["Payload", "Dehydrated spirulina / microbial protein"],
        ],
      };
    }
    case "beam": {
      const { hubName } = hit.data;
      return {
        title: "Resupply Corridor",
        subtitle: hubName,
        rows: [
          ["From", hubName],
          ["Carries", "Nutrient salts, water, seed culture, propellant, spares"],
        ],
      };
    }
    case "country": {
      const { NAME, ISO_A3 } = hit.data.properties;
      const record = foodSecurityByIso3.get(ISO_A3);
      if (!record) {
        return {
          title: NAME,
          subtitle: "Food security",
          rows: [["Data", "Not available in the loaded HDX dataset"]],
        };
      }
      const phaseOrder = ["1", "2", "3", "4", "5"];
      const phaseRows: Array<[string, string]> = phaseOrder
        .filter((phaseNum) => record.phases[phaseNum])
        .map((phaseNum) => {
          const phase = record.phases[phaseNum];
          return [`IPC Phase ${phaseNum} — ${phase.label}`, `${phase.population.toLocaleString()} (${Math.round(phase.fraction * 100)}%)`];
        });
      return {
        title: NAME,
        subtitle: `Food insecurity — ${record.periodStart} to ${record.periodEnd}`,
        rows: [
          ["Population analyzed", record.populationAnalyzed.toLocaleString()],
          [
            "Crisis or worse (Phase 3+)",
            record.phase3PlusFraction != null
              ? `${(record.phase3PlusPopulation ?? 0).toLocaleString()} (${Math.round(record.phase3PlusFraction * 100)}%)`
              : "—",
          ],
          ...phaseRows,
          ["Source", "HDX HAPI Food Security"],
        ],
      };
    }
  }
}

function buildInfoPanel() {
  const panel = document.createElement("div");
  panel.id = "info-panel";
  panel.classList.add("hidden");
  document.body.appendChild(panel);

  function show(info: SelectionInfo) {
    const rows = info.rows
      .map(
        ([label, value]) =>
          `<div class="info-row"><span class="info-label">${label}</span><span class="info-value">${value}</span></div>`,
      )
      .join("");
    panel.innerHTML = `
      <button id="info-panel-close" aria-label="Close">×</button>
      <h2>${info.title}</h2>
      ${info.subtitle ? `<p class="info-subtitle">${info.subtitle}</p>` : ""}
      ${rows}
    `;
    panel.classList.remove("hidden");
    panel.querySelector<HTMLButtonElement>("#info-panel-close")!.addEventListener("click", hide);
  }

  function hide() {
    panel.classList.add("hidden");
  }

  return { show, hide };
}

const infoPanel = buildInfoPanel();

const raycaster = new THREE.Raycaster();
raycaster.params.Line = { threshold: GLOBE_RADIUS * 0.01 };

function pointerToNDC(e: PointerEvent): THREE.Vector2 {
  const rect = canvas.getBoundingClientRect();
  return new THREE.Vector2(
    ((e.clientX - rect.left) / rect.width) * 2 - 1,
    -((e.clientY - rect.top) / rect.height) * 2 + 1,
  );
}

function pickAt(e: PointerEvent): SelectableHit | null {
  raycaster.setFromCamera(pointerToNDC(e), camera);
  const intersects = raycaster.intersectObject(globe, true);
  for (const intersect of intersects) {
    const resolved = resolveSelectable(intersect.object);
    if (resolved) return resolved;
  }
  return null;
}

let pointerDownPos: { x: number; y: number } | null = null;

canvas.addEventListener("pointerdown", (e) => {
  pointerDownPos = { x: e.clientX, y: e.clientY };
});

canvas.addEventListener("pointerup", (e) => {
  if (!pointerDownPos) return;
  const dx = e.clientX - pointerDownPos.x;
  const dy = e.clientY - pointerDownPos.y;
  pointerDownPos = null;
  if (Math.hypot(dx, dy) > 5) return; // was a drag/rotate gesture, not a click

  const hit = pickAt(e);
  if (hit) {
    infoPanel.show(describeSelection(hit));
  } else {
    infoPanel.hide();
  }
});

canvas.addEventListener("pointermove", (e) => {
  canvas.style.cursor = pickAt(e) ? "pointer" : "";
});
