import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import ThreeGlobe from "three-globe";
import { nodes, nodeById, type DeliveryNode, type HubType } from "./data/nodes";
import { routes } from "./data/routes";
import { MODE_STYLES, type DeliveryMode } from "./data/modes";
import { buildLineShape, type LineShapeKind } from "./lineShapes";
import "./style.css";

// Toggle: show/hide active deliveries (arcs, moving ship/plane/catapult
// objects, knowledge-broadcast rings, resupply beams, deorbit capsules).
// Halted for now — the previous arc/moving-object animation speeds were
// arbitrary ("not real"), not modeling real transit time, so rather than
// guess at real-world speeds this turns delivery motion off entirely while
// the orbital growing facilities (satellites — NOT gated by this flag,
// they're the persistent infrastructure, not a "delivery") get built out.
// Flip back to `true` once delivery timing is worth revisiting. See
// SPEC.md "Distribution routes toggle" for details.
const SHOW_DELIVERIES = false;

const app = document.querySelector<HTMLDivElement>("#app")!;
app.innerHTML = `<canvas id="globe-canvas"></canvas>`;

const canvas = document.querySelector<HTMLCanvasElement>("#globe-canvas")!;

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
// Cap pixel ratio — device pixel ratio of 2-3 on a high-DPI display
// quadruples/nonuples the fragment-shader workload for no visible benefit
// beyond ~2x, and this scene has gotten heavy (country + admin1 boundary
// polygon layers, ~700 meshes). Meaningful on older/integrated GPUs.
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
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

const physicalRoutes = SHOW_DELIVERIES ? routes.filter((r) => MODE_STYLES[r.mode].isPhysical) : [];
const instructionRoutes = SHOW_DELIVERIES ? routes.filter((r) => !MODE_STYLES[r.mode].isPhysical) : [];

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
  const style = MODE_STYLES[r.mode];
  return {
    startLat: from.lat,
    startLng: from.lng,
    endLat: r.toLat,
    endLng: r.toLng,
    color: style.color,
    altitude: style.altitude,
    stroke: style.stroke,
    dashDuration: style.dashDuration,
    mode: r.mode,
    fromName: from.name,
    toName: r.toName,
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
// (non-physical delivery has no path to draw). Keyed by lat/lng (not a
// node id — destinations are inline coordinates now, see routes.ts) so
// two routes landing on the same spot still dedupe to one ring.
const instructionTargets = new Map<string, { lat: number; lng: number; name: string; mode: DeliveryMode }>();
for (const r of instructionRoutes) instructionTargets.set(`${r.toLat},${r.toLng}`, { lat: r.toLat, lng: r.toLng, name: r.toName, mode: r.mode });
const ringsData: RingDatum[] = [...instructionTargets.values()].map(({ lat, lng, name, mode }) => {
  const style = MODE_STYLES[mode];
  return {
    lat,
    lng,
    color: style.color[0],
    mode,
    nodeName: name,
  };
});

const HUB_TYPE_COLORS: Record<HubType, string> = {
  port: "#38bdf8",
  air: "#fbbf24",
  space: "#a78bfa",
  depot: "#2dd4bf",
};

const HUB_TYPE_LABELS: Record<HubType, string> = {
  port: "Sea Port",
  air: "Air Cargo Hub",
  space: "Launch Site",
  depot: "Humanitarian Depot",
};

// Every hub type gets its own line-intersection shape family (see
// src/lineShapes.ts).
const HUB_TYPE_SHAPES: Record<HubType, LineShapeKind> = {
  port: "cross6",
  air: "tetraX",
  space: "star12",
  depot: "cubeStar",
};

function getPointColor(node: DeliveryNode): string {
  return HUB_TYPE_COLORS[node.hubType];
}

// No photographic texture — instead a single baked heatmap texture
// (country + admin1 boundaries and food-insecurity fill, generated by
// scripts/build_food_security_data.py from the same GeoJSON/HDX data used
// elsewhere in this file). This used to be ~700 live 3D polygon meshes
// (one per country/admin1 region) rendered directly by three-globe's
// .polygonsData() — that turned out to crash Chromium on at least one
// machine with older integrated graphics. Baking to one texture collapses
// ~700 draw calls into 1; see the "move heatmap rendering to a baked
// texture" update in SPEC.md for the full incident.
const GLOBE_SURFACE_COLOR = 0x0b1220;

const globeMaterial = new THREE.MeshPhongMaterial({
  color: GLOBE_SURFACE_COLOR,
  emissive: GLOBE_SURFACE_COLOR,
  emissiveIntensity: 0.25,
  shininess: 4,
});

const globe = new ThreeGlobe()
  .globeMaterial(globeMaterial)
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

// Admin1 (state/province) boundary polygons — see the "Admin1 granularity"
// comment further down. Deliberately lean properties (only what's needed
// to render + look up food security data), built by
// scripts/build_food_security_data.py from geoBoundaries.org geometry.
interface Admin1Feature {
  properties: { shapeID: string; shapeName: string; locationCode: string };
  geometry: { type: "Polygon" | "MultiPolygon"; coordinates: GeoPolygon | GeoPolygon[] };
}

interface Admin1FeatureCollection {
  features: Admin1Feature[];
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

// Admin1 (state/province) granularity — see scripts/build_food_security_data.py.
// HDX's admin1_code doesn't line up with any bundled or easily-joinable
// boundary dataset, so the build script joins by normalized region name
// against geoBoundaries.org polygons instead — approximate, not exact,
// and not every HDX region has a match (~62% do, see SPEC.md for the
// coverage breakdown). Only matched regions exist in these files at all.
interface Admin1Record extends FoodSecurityRecord {
  locationCode: string;
  name: string;
}

interface Admin1Dataset {
  source: string;
  sourceUrl: string;
  boundarySource: string;
  matchNote: string;
  regions: Record<string, Admin1Record>; // keyed by geoBoundaries shapeID
}

// Populated once /data/food_security_current.json and
// /data/food_security_admin1.json load; describeSelection (defined
// further down) reads these by closing over the variables, not the
// value, so it sees the populated maps once the fetches resolve.
let foodSecurityByIso3 = new Map<string, FoodSecurityRecord>();
let foodSecurityByAdmin1Id = new Map<string, Admin1Record>();

// Kept client-side even though the heatmap itself is a baked texture now —
// still needed for click-to-inspect (point-in-polygon lookup against the
// click coordinate, see resolveRegionAt further down) since there's no
// mesh per region to raycast against anymore.
let countryFeatures: CountryFeature[] = [];
let admin1Features: Admin1Feature[] = [];

// IPC-style severity ramp (green -> yellow -> orange -> red -> maroon),
// keyed on the Phase-3-or-worse ("Crisis or worse") population fraction.
// The heatmap fill itself is baked into the texture now (Python-side copy
// of this same ramp — see scripts/build_food_security_data.py's
// HEATMAP_COLOR_STOPS, kept in sync by hand); this copy is only used for
// the legend swatches.
const HEATMAP_COLOR_STOPS: Array<[number, THREE.Color]> = [
  [0, new THREE.Color(0x16a34a)],
  [0.15, new THREE.Color(0xeab308)],
  [0.3, new THREE.Color(0xf97316)],
  [0.5, new THREE.Color(0xdc2626)],
  [0.75, new THREE.Color(0x7f1d1d)],
];

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
  fetch("/data/admin1_boundaries.geojson").then((res) => res.json() as Promise<Admin1FeatureCollection>),
  fetch("/data/food_security_admin1.json").then((res) => res.json() as Promise<Admin1Dataset>),
]).then(([countries, foodSecurity, admin1, admin1FoodSecurity]) => {
  foodSecurityByIso3 = new Map(Object.entries(foodSecurity.countries));
  foodSecurityByAdmin1Id = new Map(Object.entries(admin1FoodSecurity.regions));
  countryFeatures = countries.features;
  admin1Features = admin1.features;

  const labelsData: CountryLabelDatum[] = countries.features.map((feature) => {
    const { lat, lng } = countryCentroid(feature.geometry);
    return { lat, lng, name: feature.properties.NAME };
  });

  globe
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

// Baked heatmap texture (country + admin1 boundaries and fill — see
// scripts/build_food_security_data.py) applied as the globe's diffuse
// map. Loaded independently of the Promise.all above — it's a static
// asset, not derived from those fetches — so it can start decoding as
// soon as possible rather than waiting on 4 other requests.
new THREE.TextureLoader().load("/data/heatmap_texture.png", (texture) => {
  texture.colorSpace = THREE.SRGBColorSpace;
  globeMaterial.map = texture;
  globeMaterial.needsUpdate = true;
});

// --- Hub markers ---------------------------------------------------------
// Rendered as custom line-intersection shapes (src/lineShapes.ts) rather
// than three-globe's built-in solid point dots — every sprite in this scene
// is a set of lines radiating from a single point in space. Need/severity
// no longer gets a sprite at all — see the "Granular need heatmap" update
// in SPEC.md — it's carried entirely by the country/admin1 boundary
// polygon heatmap further down instead.

function buildNodeMarker(node: DeliveryNode): THREE.Object3D {
  const marker = buildLineShape(HUB_TYPE_SHAPES[node.hubType], 1.8, getPointColor(node));
  marker.userData.selectableType = "node";
  marker.userData.selectableData = node;
  return marker;
}

for (const node of nodes) {
  const coords = globe.getCoords(node.lat, node.lng, 0.012);
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
  const style = MODE_STYLES[r.mode];
  const curve = buildArcCurve(from.lat, from.lng, r.toLat, r.toLng, style.altitude);
  const mesh = makeModeMesh(r.mode);
  mesh.userData.selectableType = "moving";
  mesh.userData.selectableData = { mode: r.mode, fromName: from.name, toName: r.toName };
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

// Growing-facility production model, per docs/SPACE_DELIVERY.md's per-unit
// spec table: "tens of kg dehydrated protein product per week per unit —
// baseline for pilot testing, not a delivered fact." 40 is the chosen
// midpoint. Production accumulates continuously at this real rate (real
// minutes/hours of wall-clock time, not sim-accelerated) — deliberately
// unbounded: there's no cap, the facility just keeps growing food for as
// long as it exists, which is the literal "grow food infinitely" ask.
const FOOD_OUTPUT_KG_PER_WEEK = 40;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const BIOREACTOR_TYPE = "Spirulina/algae photobioreactor + gas-fermentation microbial protein";

function foodGrownGrams(elapsedMs: number): number {
  return (FOOD_OUTPUT_KG_PER_WEEK * 1000 * elapsedMs) / WEEK_MS;
}

// Real orbital period via Kepler's third law — NOT tied to
// MODE_STYLES.space.altitude/ORBIT_RADIUS, which is a stylized render
// placement fraction, unrelated to physical altitude. Altitude range and
// orbit type are per docs/SPACE_DELIVERY.md: "dawn-dusk sun-synchronous
// LEO, ~600-800 km." Previously this used an arbitrary 20-32 second loop
// tuned to be watchable, which the user correctly flagged as "not to a
// NASA standard" — a real satellite at this altitude takes ~97-101
// minutes per orbit, not seconds.
const EARTH_RADIUS_KM = 6371;
const EARTH_GM_KM3_PER_S2 = 398600.4418; // standard gravitational parameter, μ
const REAL_ORBIT_ALTITUDE_KM_MIN = 600;
const REAL_ORBIT_ALTITUDE_KM_MAX = 800;

function orbitalPeriodMs(altitudeKm: number): number {
  const radiusKm = EARTH_RADIUS_KM + altitudeKm;
  const periodSeconds = 2 * Math.PI * Math.sqrt(radiusKm ** 3 / EARTH_GM_KM3_PER_S2);
  return periodSeconds * 1000;
}

interface Satellite {
  mesh: THREE.Object3D;
  inclination: number;
  raan: number;
  phase0: number;
  altitudeKm: number;
  periodMs: number;
  angularSpeed: number; // radians per ms
}

// A compound shape rather than one bare primitive: a dense `star12` core
// (the bioreactor/fermenter cluster) plus a wider `cross6` overlay (solar
// array booms) — reads as a facility with distinct parts, not a generic
// point marker, while staying inside the same line-intersection vocabulary
// as every other sprite.
function makeSatelliteMesh(): THREE.Object3D {
  const group = new THREE.Group();
  const core = buildLineShape("star12", 1.6, 0xcbd5e1);
  const solarArray = buildLineShape("cross6", 3.2, 0x38bdf8);
  group.add(core, solarArray);
  return group;
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

// Satellites are the orbital growing facilities themselves — persistent
// infrastructure, not a "delivery" — so they render unconditionally,
// independent of SHOW_DELIVERIES.
const satellites: Satellite[] = Array.from({ length: SATELLITE_COUNT }, (_, i) => {
  const mesh = makeSatelliteMesh();
  mesh.userData.selectableType = "satellite";
  mesh.userData.selectableData = { index: i };
  globe.add(mesh);
  const altitudeKm =
    REAL_ORBIT_ALTITUDE_KM_MIN +
    (i / (SATELLITE_COUNT - 1)) * (REAL_ORBIT_ALTITUDE_KM_MAX - REAL_ORBIT_ALTITUDE_KM_MIN);
  const periodMs = orbitalPeriodMs(altitudeKm);
  return {
    mesh,
    inclination: Math.PI / 6 + (i % 4) * (Math.PI / 8),
    raan: (i / SATELLITE_COUNT) * Math.PI * 2,
    phase0: (i / SATELLITE_COUNT) * Math.PI * 2 * 1.618,
    altitudeKm,
    periodMs,
    angularSpeed: (Math.PI * 2) / periodMs,
  };
});

// Resupply beams (nutrient/water/propellant lines from space hubs to
// orbit) are a line trace, same as arcs/capsules — halted along with
// deliveries per SHOW_DELIVERIES rather than treated as an exception.
const spaceHubs = nodes.filter((n) => n.hubType === "space");
if (SHOW_DELIVERIES) {
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
  return {
    targetLat: r.toLat,
    targetLng: r.toLng,
    targetName: r.toName,
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

  const hubRows = (Object.entries(HUB_TYPE_LABELS) as Array<[HubType, string]>)
    .map(
      ([type, label]) =>
        `<div class="legend-row"><span class="swatch" style="background:${HUB_TYPE_COLORS[type]}"></span>${label}</div>`,
    )
    .join("");

  const routeRows = SHOW_DELIVERIES
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
    <p class="tagline">Admin1 (state/province) detail where available, country-level otherwise.</p>
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
  | { type: "country"; data: CountryFeature }
  | { type: "admin1"; data: Admin1Feature };

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
    }
    obj = obj.parent;
  }
  return null;
}

// Country/admin1 selection used to resolve via mesh raycasting (one mesh
// per region, tagged by three-globe's polygon layer). That layer is gone
// — see the "move heatmap rendering to a baked texture" update in
// SPEC.md — so a click that lands on the bare globe surface (not a hub
// marker, satellite, etc.) instead gets its lat/lng and is resolved
// against the same GeoJSON via plain point-in-polygon math. This only
// runs once per click, not per frame or per pointermove, so the cost of
// testing up to ~700 polygons is negligible in practice.

// Standard ray-casting point-in-polygon test (crossing number), ignoring
// holes — same simplification already used for centroid math above.
function ringContains(ring: GeoRing, lng: number, lat: number): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const crosses = yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (crosses) inside = !inside;
  }
  return inside;
}

function pointInPolygon(lat: number, lng: number, geometry: CountryFeature["geometry"]): boolean {
  const polygons: GeoPolygon[] = geometry.type === "Polygon" ? [geometry.coordinates as GeoPolygon] : (geometry.coordinates as GeoPolygon[]);
  return polygons.some((polygon) => ringContains(polygon[0], lng, lat));
}

function resolveRegionAt(lat: number, lng: number): SelectableHit | null {
  for (const feature of admin1Features) {
    if (pointInPolygon(lat, lng, feature.geometry)) return { type: "admin1", data: feature };
  }
  for (const feature of countryFeatures) {
    if (pointInPolygon(lat, lng, feature.geometry)) return { type: "country", data: feature };
  }
  return null;
}

// Shared by the "country" and "admin1" cases below — same IPC phase
// breakdown rendering regardless of which granularity was clicked.
function foodSecurityDetailRows(record: FoodSecurityRecord): Array<[string, string]> {
  const phaseOrder = ["1", "2", "3", "4", "5"];
  const phaseRows: Array<[string, string]> = phaseOrder
    .filter((phaseNum) => record.phases[phaseNum])
    .map((phaseNum) => {
      const phase = record.phases[phaseNum];
      return [`IPC Phase ${phaseNum} — ${phase.label}`, `${phase.population.toLocaleString()} (${Math.round(phase.fraction * 100)}%)`];
    });
  return [
    ["Population analyzed", record.populationAnalyzed.toLocaleString()],
    [
      "Crisis or worse (Phase 3+)",
      record.phase3PlusFraction != null
        ? `${(record.phase3PlusPopulation ?? 0).toLocaleString()} (${Math.round(record.phase3PlusFraction * 100)}%)`
        : "—",
    ],
    ...phaseRows,
    ["Source", "HDX HAPI Food Security"],
  ];
}

function describeSelection(hit: SelectableHit): SelectionInfo {
  switch (hit.type) {
    case "node": {
      const node = hit.data;
      const typeLabel = HUB_TYPE_LABELS[node.hubType];
      return {
        title: node.name,
        subtitle: typeLabel,
        rows: [
          ["Type", typeLabel],
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
        title: `Orbital Growing Platform ${hit.data.index + 1}`,
        subtitle: "Autonomous closed-loop food-growing facility",
        rows: [
          ["Orbit", "Dawn-dusk sun-synchronous LEO"],
          ["Altitude", sat ? `${sat.altitudeKm.toFixed(0)} km (real)` : "—"],
          ["Orbital period", sat ? `${(sat.periodMs / 60000).toFixed(1)} min (real, Kepler's 3rd law)` : "—"],
          ["Inclination", sat ? `${(sat.inclination * (180 / Math.PI)).toFixed(0)}°` : "—"],
          ["Bioreactor", BIOREACTOR_TYPE],
          ["Output rate", `~${FOOD_OUTPUT_KG_PER_WEEK} kg dehydrated product / week`],
          ["Grown so far (real time, unbounded)", `${foodGrownGrams(latestElapsedMs).toFixed(2)} g`],
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
      return {
        title: NAME,
        subtitle: `Country-level food insecurity — ${record.periodStart} to ${record.periodEnd}`,
        rows: foodSecurityDetailRows(record),
      };
    }
    case "admin1": {
      const { shapeName, locationCode } = hit.data.properties;
      const record = foodSecurityByAdmin1Id.get(hit.data.properties.shapeID);
      if (!record) {
        return {
          title: shapeName,
          subtitle: locationCode,
          rows: [["Data", "Not available in the loaded HDX dataset"]],
        };
      }
      return {
        title: shapeName,
        subtitle: `${locationCode} — ${record.periodStart} to ${record.periodEnd}`,
        rows: foodSecurityDetailRows(record),
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

// Mesh-only pick: hub markers, satellites, capsules, resupply beams,
// arcs/rings. Cheap — this is what pointermove hover uses every frame, so
// it deliberately does NOT fall through to the country/admin1
// point-in-polygon lookup (see pickClickTarget below for that).
function pickAt(e: PointerEvent): SelectableHit | null {
  raycaster.setFromCamera(pointerToNDC(e), camera);
  const intersects = raycaster.intersectObject(globe, true);
  for (const intersect of intersects) {
    const resolved = resolveSelectable(intersect.object);
    if (resolved) return resolved;
  }
  return null;
}

// Click-only: mesh pick first, then falls through to a point-in-polygon
// lookup against the click's lat/lng if the ray hit the bare globe
// surface (three-globe tags its own sphere mesh __globeObjType ===
// "globe"). Only runs on an actual click (pointerup, not every
// pointermove), so the extra point-in-polygon cost doesn't matter.
function pickClickTarget(e: PointerEvent): SelectableHit | null {
  raycaster.setFromCamera(pointerToNDC(e), camera);
  const intersects = raycaster.intersectObject(globe, true);
  for (const intersect of intersects) {
    const resolved = resolveSelectable(intersect.object);
    if (resolved) return resolved;
    const extras = intersect.object as unknown as GlobeObjectExtras;
    if (extras.__globeObjType === "globe") {
      const { lat, lng } = globe.toGeoCoords(intersect.point);
      return resolveRegionAt(lat, lng);
    }
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

  const hit = pickClickTarget(e);
  if (hit) {
    infoPanel.show(describeSelection(hit));
  } else {
    infoPanel.hide();
  }
});

// Raw pointermove fires far more often than the display can redraw —
// often 100+ times/sec on a fast mouse. Each pickAt() is a raycast against
// every polygon mesh on the globe (country + admin1 boundary layers, ~700
// meshes combined since the admin1 heatmap was added), so doing this on
// every raw event pegs the CPU. Coalesce to at most one raycast per
// rendered frame instead — only the latest pointer position matters, the
// intermediate ones were never going to be seen anyway.
let hoverRaf: number | null = null;
let latestHoverEvent: PointerEvent | null = null;

canvas.addEventListener("pointermove", (e) => {
  latestHoverEvent = e;
  if (hoverRaf !== null) return;
  hoverRaf = requestAnimationFrame(() => {
    hoverRaf = null;
    if (latestHoverEvent) canvas.style.cursor = pickAt(latestHoverEvent) ? "pointer" : "";
  });
});
