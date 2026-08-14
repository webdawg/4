import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import ThreeGlobe from "three-globe";
import { nodes, nodeById, type DeliveryNode, type HubType } from "./data/nodes";
import { routes } from "./data/routes";
import { droneStations, droneStationById, type DroneStation } from "./data/droneStations";
import { MODE_STYLES, type DeliveryMode } from "./data/modes";
import { buildLineShape, type LineShapeKind } from "./lineShapes";
import { haversineDistanceKm } from "./geo";
import "./style.css";

// Toggle: show/hide active deliveries (arcs, moving objects for every
// physical mode — ship/plane/catapult/drone/submarine/train/porter —
// knowledge-broadcast rings, resupply beams, deorbit capsules). Was off
// for several sessions (the old arc/moving-object speeds were arbitrary,
// "not real") while the orbital growing facilities and then the
// ocean farm / autonomous transport / drone / expansion-mode subsystems
// got built out (satellites/hubs/drone stations were never gated by this
// flag — they're persistent infrastructure, not a "delivery"). Turned
// back on now that there's a full set of modes worth actually seeing
// move. See SPEC.md "Deliveries toggle" for the history.
const SHOW_DELIVERIES = true;

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

// A route's `from` can be a hub id (nodeById) or a drone station id
// (droneStationById) — stations are deliberately not hubs (see
// src/data/droneStations.ts), so route origin resolution has to check
// both rather than assume every route starts at a hub.
function resolveRouteOrigin(id: string): { lat: number; lng: number; name: string } {
  const origin = nodeById.get(id) ?? droneStationById.get(id);
  if (!origin) throw new Error(`Route origin "${id}" is not a known hub or drone station`);
  return origin;
}

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
  ocean_farm: "#22c55e",
};

const HUB_TYPE_LABELS: Record<HubType, string> = {
  port: "Sea Port",
  air: "Air Cargo Hub",
  space: "Launch Site",
  depot: "Humanitarian Depot",
  ocean_farm: "Floating Ocean Farm",
};

// Every hub type gets its own line-intersection shape family (see
// src/lineShapes.ts) — as of ocean_farm's star20, all five Platonic
// solids are now represented (octahedron/tetrahedron/cube/icosahedron/
// dodecahedron), not by coincidence — see docs/OCEAN_FARM.md's closing
// section.
const HUB_TYPE_SHAPES: Record<HubType, LineShapeKind> = {
  port: "cross6",
  air: "tetraX",
  space: "star12",
  depot: "cubeStar",
  ocean_farm: "star20",
};

function getPointColor(node: DeliveryNode): string {
  return HUB_TYPE_COLORS[node.hubType];
}

// No photographic texture. The heatmap fill (country + admin1
// food-insecurity color) is a single baked texture, generated by
// scripts/build_food_security_data.py from the same GeoJSON/HDX data used
// elsewhere in this file. Boundary *lines* are NOT in that texture — a
// rasterized 1px line blurs once texture-filtered onto a sphere, so they
// render as actual vector line geometry instead (see addBoundaryLines
// further down), built from the same GeoJSON, so the two layers can't
// drift out of alignment with each other. Both pieces replace what used
// to be ~700 live 3D polygon meshes (one per country/admin1 region,
// three-globe's .polygonsData()) — that turned out to crash Chromium on
// at least one machine with older integrated graphics. See the "move
// heatmap rendering to a baked texture" update in SPEC.md for the full
// incident.
const GLOBE_SURFACE_COLOR = 0x0b1220;

// Standard IPC/CH color-coding (Integrated Food Security Phase
// Classification cartographic standard) — mirrors IPC_PHASE_COLORS in
// scripts/build_food_security_data.py. Single source of truth for fill
// (baked texture, Python), boundary line color, starvation zone marker
// color, and the legend — every layer that shows severity uses the same
// 5 discrete phases and the same colors for them, not an invented ramp.
const IPC_PHASE_COLORS: Record<number, string> = {
  1: "#cdfacd", // Minimal
  2: "#fae61e", // Stressed
  3: "#e67800", // Crisis
  4: "#c80000", // Emergency
  5: "#640000", // Catastrophe/Famine
};
const IPC_PHASE_LABELS: Record<number, string> = {
  1: "Minimal",
  2: "Stressed",
  3: "Crisis",
  4: "Emergency",
  5: "Catastrophe/Famine",
};
// No HDX coverage at all for this country/region — neutral, not part of
// the severity scale (so it doesn't read as "Minimal").
const NO_DATA_COLOR = "#475569";

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
type GeoJsonGeometry = { type: "Polygon" | "MultiPolygon"; coordinates: GeoPolygon | GeoPolygon[] };

// A Polygon's coordinates are one GeoPolygon (rings); a MultiPolygon's are
// several. Normalized to "always a list of polygons" so callers don't
// need to branch on geometry.type themselves.
function geometryPolygons(geometry: GeoJsonGeometry): GeoPolygon[] {
  return geometry.type === "Polygon" ? [geometry.coordinates as GeoPolygon] : (geometry.coordinates as GeoPolygon[]);
}

interface CountryFeature {
  properties: { NAME: string; ISO_A3: string };
  geometry: GeoJsonGeometry;
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
  geometry: GeoJsonGeometry;
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
  areaPhase: number | null; // IPC 1-5, via the 20% rule — see IPC_PHASE_COLORS
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

// District-level (admin2) "starvation zone" — localized Phase 4/5 areas,
// pre-resolved server-side (scripts/build_food_security_data.py) to a
// point: the matched admin2 boundary's centroid where geoBoundaries had
// one, else the parent admin1's centroid, else the country's — see
// locationSource. These are the areas a country/admin1-level average can
// hide entirely (e.g. a famine district in an otherwise "Crisis"-level
// country). Rendered as a flat "highlighter" fill baked directly into the
// heatmap texture (scripts/build_food_security_data.py's
// draw_zone_highlight) — the real matched district shape where one exists
// (zoneBoundaryFeatures below), or a soft circular approximation of
// radius fallbackRadiusDeg centered on lat/lng otherwise. Not a client-
// side 3D object at all; this interface exists purely for click-to-inspect
// hit-testing (see resolveRegionAt) and the info panel.
interface StarvationZone {
  id: string;
  locationCode: string;
  countryName: string;
  admin1Name: string;
  admin2Name: string;
  lat: number;
  lng: number;
  locationSource: "admin2" | "admin1" | "country";
  fallbackRadiusDeg: number | null; // null when a real boundary matched (locationSource === "admin2")
  periodStart: string;
  periodEnd: string;
  populationAnalyzed: number;
  areaPhase: number;
  phase4PlusFraction: number;
  phase5Fraction: number;
  phases: Record<string, FoodSecurityPhase>;
}

interface StarvationZoneDataset {
  source: string;
  sourceUrl: string;
  threshold: number;
  zones: StarvationZone[];
}

// Real matched district polygons for the zones where geoBoundaries had
// one (StarvationZone.locationSource === "admin2") — used only for
// click-to-inspect point-in-polygon testing; the fill itself is already
// baked into the heatmap texture, this is not rendered as separate
// geometry.
interface ZoneBoundaryFeature {
  properties: { zoneId: string };
  geometry: GeoJsonGeometry;
}

interface ZoneBoundaryFeatureCollection {
  features: ZoneBoundaryFeature[];
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
let starvationZones: StarvationZone[] = [];
let zoneBoundaryFeatures: ZoneBoundaryFeature[] = [];
const zoneBoundaryById = new Map<string, ZoneBoundaryFeature>();

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
function countryCentroid(geometry: GeoJsonGeometry): { lat: number; lng: number } {
  let best: { lat: number; lng: number; area: number } | null = null;
  for (const polygon of geometryPolygons(geometry)) {
    const centroid = ringCentroid(polygon[0]);
    if (!best || centroid.area > best.area) best = centroid;
  }
  return best ?? { lat: 0, lng: 0 };
}

// Boundary lines: one plain THREE.Line per polygon ring, built straight
// from the same GeoJSON used for the heatmap texture (Python) and
// point-in-polygon click detection (below) — a single source of truth,
// so nothing can drift out of alignment between the fill color, the
// lines, and what a click resolves to. Deliberately NOT three-globe's
// .polygonsData() (ConicPolygonGeometry — extruded cap+side+stroke,
// curvature-subdivided) — that's the rendering path that crashed
// Chromium. A bare line has no fill or extrusion, just vertices: stays
// crisp at any zoom (no texture-filtering blur a rasterized line would
// have), and is cheap enough that hundreds of them were never the
// problem — the resupply beams and line-shape sprites elsewhere in this
// file use the same THREE.Line primitive without incident.
const LINE_ALTITUDE = 0.0015;

// One THREE.LineSegments (i.e. one draw call) per layer, not one Line per
// polygon ring — hundreds of separate line objects would still have been
// fine (lines are cheap), but merging every ring's segments into a single
// buffer is strictly better and costs nothing extra to do: 2 draw calls
// total for ~700 combined country+admin1 regions instead of ~700+.
//
// Each region's line color reflects its OWN food-insecurity classification
// (IPC_PHASE_COLORS) rather than a flat per-layer color — vertex colors on
// one shared buffer keep this at 2 draw calls total, same as before.
function addBoundaryLines<F extends { geometry: GeoJsonGeometry }>(features: F[], colorForFeature: (feature: F) => THREE.Color): void {
  const positions: number[] = [];
  const vertexColors: number[] = [];
  for (const feature of features) {
    const { r, g, b } = colorForFeature(feature);
    for (const polygon of geometryPolygons(feature.geometry)) {
      const ring = polygon[0];
      for (let i = 0; i < ring.length - 1; i++) {
        const [lng0, lat0] = ring[i];
        const [lng1, lat1] = ring[i + 1];
        const c0 = globe.getCoords(lat0, lng0, LINE_ALTITUDE);
        const c1 = globe.getCoords(lat1, lng1, LINE_ALTITUDE);
        positions.push(c0.x, c0.y, c0.z, c1.x, c1.y, c1.z);
        vertexColors.push(r, g, b, r, g, b);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(vertexColors, 3));
  const material = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.9 });
  const lines = new THREE.LineSegments(geometry, material);
  // Decorative only — not selectable, and skipping raycast entirely keeps
  // hover/click picking exactly as cheap as it is without these lines.
  lines.raycast = () => {};
  globe.add(lines);
}

function ipcColor(areaPhase: number | null | undefined): THREE.Color {
  return new THREE.Color(areaPhase != null ? IPC_PHASE_COLORS[areaPhase] : NO_DATA_COLOR);
}

Promise.all([
  fetch("/data/ne_110m_admin_0_countries.geojson").then((res) => res.json() as Promise<CountryFeatureCollection>),
  fetch("/data/food_security_current.json").then((res) => res.json() as Promise<FoodSecurityDataset>),
  fetch("/data/admin1_boundaries.geojson").then((res) => res.json() as Promise<Admin1FeatureCollection>),
  fetch("/data/food_security_admin1.json").then((res) => res.json() as Promise<Admin1Dataset>),
  fetch("/data/starvation_zones.json").then((res) => res.json() as Promise<StarvationZoneDataset>),
  fetch("/data/starvation_zone_boundaries.geojson").then((res) => res.json() as Promise<ZoneBoundaryFeatureCollection>),
]).then(([countries, foodSecurity, admin1, admin1FoodSecurity, zoneDataset, zoneBoundaries]) => {
  foodSecurityByIso3 = new Map(Object.entries(foodSecurity.countries));
  foodSecurityByAdmin1Id = new Map(Object.entries(admin1FoodSecurity.regions));
  countryFeatures = countries.features;
  admin1Features = admin1.features;
  starvationZones = zoneDataset.zones;
  zoneBoundaryFeatures = zoneBoundaries.features;
  for (const feature of zoneBoundaryFeatures) zoneBoundaryById.set(feature.properties.zoneId, feature);

  // Country lines first (coarser, everywhere), admin1 lines on top
  // (finer, wherever matched) — same layering the old live-mesh version
  // used, just as lines instead of extruded fills now. Every country gets
  // a line regardless of data coverage (neutral gray if none) so its
  // shape stays visible even where the fill texture has nothing to draw.
  // Starvation zones are NOT rendered here at all — they're a flat fill
  // already baked into the heatmap texture (see
  // scripts/build_food_security_data.py's draw_zone_highlight); the
  // starvationZones/zoneBoundaryFeatures arrays above exist purely for
  // click-to-inspect (resolveRegionAt checks them before admin1/country).
  addBoundaryLines(countryFeatures, (feature) => ipcColor(foodSecurityByIso3.get(feature.properties.ISO_A3)?.areaPhase));
  addBoundaryLines(admin1Features, (feature) => {
    const own = foodSecurityByAdmin1Id.get(feature.properties.shapeID)?.areaPhase;
    if (own != null) return ipcColor(own);
    // Admin1 shape exists (boundary matched) but this specific region has
    // no HDX row — fall back to the parent country's classification
    // rather than a flat neutral, so it still reads as *something*
    // sensible instead of looking like a data gap right next to data.
    return ipcColor(foodSecurityByIso3.get(feature.properties.locationCode)?.areaPhase);
  });

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

// Ocean farms are physically enormous relative to every other hub — a
// ~1km² platform vs. a port terminal or a depot warehouse — and now sit
// out in open ocean where there's nothing else nearby to give them scale,
// so they get a distinctly larger marker instead of the shared hub size.
const HUB_MARKER_SIZE: Partial<Record<HubType, number>> = {
  ocean_farm: 4.2,
};
const DEFAULT_HUB_MARKER_SIZE = 1.8;

function buildNodeMarker(node: DeliveryNode): THREE.Object3D {
  const size = HUB_MARKER_SIZE[node.hubType] ?? DEFAULT_HUB_MARKER_SIZE;
  const marker = buildLineShape(HUB_TYPE_SHAPES[node.hubType], size, getPointColor(node));
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

// Ocean farm production model, per docs/OCEAN_FARM.md's per-unit spec
// table: ~120 t/yr combined dehydrated kelp+dulse product, and — a
// secondary benefit riding on the same infrastructure, not the site's
// reason for existing — "low hundreds of kg to low single-digit
// tonnes/yr" microplastic/debris capture, 1 t/yr taken as this
// counter's baseline (the doc's own range midpoint-ish, framed there as
// a planning estimate, not a delivered fact). Same real-elapsed-time,
// deliberately uncapped counter pattern as the orbital platforms'
// foodGrownGrams — grows for as long as the farm exists, nothing more.
const OCEAN_FARM_FOOD_OUTPUT_TONNES_PER_YEAR = 120;
const OCEAN_FARM_MICROPLASTIC_TONNES_PER_YEAR = 1;
const YEAR_MS = 365 * 24 * 60 * 60 * 1000;
const OCEAN_FARM_CROPS = "Sugar kelp (bulk biomass) + dulse (protein-dense red algae) — no animal aquaculture";

function oceanFarmFoodGrownGrams(elapsedMs: number): number {
  return (OCEAN_FARM_FOOD_OUTPUT_TONNES_PER_YEAR * 1_000_000 * elapsedMs) / YEAR_MS;
}

function oceanFarmMicroplasticGrams(elapsedMs: number): number {
  return (OCEAN_FARM_MICROPLASTIC_TONNES_PER_YEAR * 1_000_000 * elapsedMs) / YEAR_MS;
}

// --- Drone stations --------------------------------------------------------
// See docs/DRONE_DELIVERY.md. Deliberately not a hub type (src/data/nodes.ts)
// — stations are lightweight, numerous, and frequently not co-located with
// any hub at all, the same architectural reason satellites aren't hubs
// either. Static (no orbital motion, unlike satellites), so no per-frame
// position update is needed once placed.
const DRONE_STATION_COLOR = 0xe879f9; // fuchsia — distinct from every hub/mode color already in use

function makeDroneStationMesh(): THREE.Object3D {
  const group = new THREE.Group();
  // Compound shape, same visual grammar as the satellites' core+array
  // construction: a small sharp core (the launch rail / airframe) plus a
  // wider cross (solar + wind power system).
  const core = buildLineShape("tetraX", 1.1, DRONE_STATION_COLOR);
  const powerSystem = buildLineShape("cross6", 2.0, DRONE_STATION_COLOR);
  group.add(core, powerSystem);
  return group;
}

for (const station of droneStations) {
  const coords = globe.getCoords(station.lat, station.lng, 0.01);
  const mesh = makeDroneStationMesh();
  mesh.position.set(coords.x, coords.y, coords.z);
  mesh.userData.selectableType = "droneStation";
  mesh.userData.selectableData = station;
  globe.add(mesh);
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

// Moving shipments (and deorbit capsules, see spawnCapsule) render as a
// plain glowing dot — replaced the earlier per-mode line-shape sprites
// (crosses/stars) and the arcs' animated dash trail both: just a dot
// traveling from origin to destination, nothing else drawing the path.
// The dot still follows the mode-specific curve altitude from
// buildArcCurve, so different modes still read as flying at different
// heights — that information didn't depend on the arc line being drawn.
function makeDotMesh(size: number, colorValue: THREE.ColorRepresentation): THREE.Object3D {
  const color = new THREE.Color(colorValue);
  const geometry = new THREE.SphereGeometry(size, 12, 12);
  const material = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.9,
    roughness: 0.3,
    metalness: 0.1,
  });
  return new THREE.Mesh(geometry, material);
}

function makeModeMesh(mode: DeliveryMode): THREE.Object3D {
  return makeDotMesh(1.1, MODE_STYLES[mode].color[0]);
}

interface MovingObject {
  curve: THREE.QuadraticBezierCurve3;
  mesh: THREE.Object3D;
  durationMs: number;
  offsetMs: number;
}

// Every route used to take the same fixed animation time regardless of
// how far it actually traveled — a route from Rotterdam to Yemen looped
// in the exact same time as one a tenth the distance, which read as
// obviously wrong (specifically flagged for the land modes, whose
// generated routes include some of the longest same-continent hauls).
// Duration is now derived from each route's real great-circle distance
// and its mode's real speedKmh, so relative speed differences between
// routes (and between modes) are real, not arbitrary.
//
// Real transit time (distanceKm / speedKmh, in hours) is compressed
// through a square root, not used linearly — a route 100x farther in
// real transit time only takes ~10x longer on screen, not literally
// 100x. Linear scaling would mean either short routes are instant or
// long ocean crossings take many minutes to complete a single loop;
// sqrt keeps every route perceptibly moving while still preserving real
// relative order (farther/slower routes visibly take longer than
// closer/faster ones), the same "real but still watchable" tradeoff
// already made for the satellites' production counter.
// "it should all be real world speeds" — no compression, no min/max
// clamp, full stop. A route's duration is exactly distanceKm / speedKmh
// converted to milliseconds: real wall-clock transit time, the same
// "real, not fake-watchable" standard already applied to the satellites'
// orbital period (real ~97 minutes, Kepler's third law) and the food
// production counters (real grams per real minute). Direct consequence,
// not a bug: a ship on a multi-thousand-km route takes real days to
// cross the globe, so during any normal browsing session it will look
// close to stationary — exactly as close to stationary as a real ship
// crossing a real ocean looks over five real minutes of watching it.
const MS_PER_HOUR = 60 * 60 * 1000;

function movingObjectDurationMs(distanceKm: number, speedKmh: number): number {
  return (distanceKm / speedKmh) * MS_PER_HOUR;
}

const movingObjects: MovingObject[] = surfaceRoutes.map((r, i) => {
  const from = resolveRouteOrigin(r.from);
  const style = MODE_STYLES[r.mode];
  const curve = buildArcCurve(from.lat, from.lng, r.toLat, r.toLng, style.altitude);
  const mesh = makeModeMesh(r.mode);
  mesh.userData.selectableType = "moving";
  mesh.userData.selectableData = { mode: r.mode, fromName: from.name, toName: r.toName };
  globe.add(mesh);
  const distanceKm = haversineDistanceKm(from.lat, from.lng, r.toLat, r.toLng);
  const durationMs = movingObjectDurationMs(distanceKm, style.speedKmh ?? 100);
  return {
    curve,
    mesh,
    durationMs,
    offsetMs: (i / surfaceRoutes.length) * durationMs,
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
  const mesh = makeDotMesh(0.9, 0x7dd3fc);
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

// --- Time acceleration/deceleration ---------------------------------
// Real-world speed (see SPEC.md's last several updates) means most
// routes/orbits are close to motionless over a normal viewing session —
// intentional, not a bug, but not always what you want to be looking at.
// This scales the *simulated clock*, not the underlying physics —
// distances, speeds, and orbital periods stay real; this only controls
// how fast simulated time itself passes. 1x is true real time; >1x
// fast-forwards (watch a multi-week voyage in seconds); <1x is slow
// motion (actually see a fast mode like a drone in detail instead of a
// blink). Accumulated rather than derived from a single clock read, so
// changing the scale mid-session doesn't jump anything — only time from
// this point forward speeds up or slows down.
let timeScale = 1;
const TIME_SCALE_MIN = 0.01;
const TIME_SCALE_MAX = 100000;
const TIME_SCALE_STEP_FACTOR = 10;

function formatTimeScale(scale: number): string {
  return scale >= 1 ? `${scale.toLocaleString()}x` : `1/${Math.round(1 / scale)}x`;
}

const clock = new THREE.Clock();
let simulatedElapsedMs = 0;
let latestElapsedMs = 0;

renderer.setAnimationLoop(() => {
  simulatedElapsedMs += clock.getDelta() * 1000 * timeScale;
  const elapsedMs = simulatedElapsedMs;
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
buildTimeControls();

// --- Time controls overlay -----------------------------------------------

function buildTimeControls() {
  const panel = document.createElement("div");
  panel.id = "time-controls";
  panel.innerHTML = `
    <button id="time-slower" aria-label="Slow down">−</button>
    <span id="time-scale-label"></span>
    <button id="time-faster" aria-label="Speed up">+</button>
    <button id="time-reset" aria-label="Reset to real time">1x</button>
  `;
  document.body.appendChild(panel);

  const label = panel.querySelector<HTMLSpanElement>("#time-scale-label")!;
  function render() {
    if (timeScale === 1) {
      label.textContent = "1x — real time";
    } else {
      label.textContent = `${formatTimeScale(timeScale)} ${timeScale > 1 ? "faster" : "slower"}`;
    }
  }

  panel.querySelector<HTMLButtonElement>("#time-slower")!.addEventListener("click", () => {
    timeScale = Math.max(TIME_SCALE_MIN, timeScale / TIME_SCALE_STEP_FACTOR);
    render();
  });
  panel.querySelector<HTMLButtonElement>("#time-faster")!.addEventListener("click", () => {
    timeScale = Math.min(TIME_SCALE_MAX, timeScale * TIME_SCALE_STEP_FACTOR);
    render();
  });
  panel.querySelector<HTMLButtonElement>("#time-reset")!.addEventListener("click", () => {
    timeScale = 1;
    render();
  });

  render();
}

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

  const foodSecurityRows = ([1, 2, 3, 4, 5] as const)
    .map(
      (phase) =>
        `<div class="legend-row"><span class="swatch" style="background:${IPC_PHASE_COLORS[phase]}"></span>IPC ${phase} — ${IPC_PHASE_LABELS[phase]}</div>`,
    )
    .join("");

  legend.innerHTML = `
    <h1>Food Relief Network</h1>
    <p class="tagline">Click anything on the globe to inspect it.</p>
    ${hubRows}
    <div class="legend-row"><span class="swatch" style="background:#${DRONE_STATION_COLOR.toString(16)}"></span>Drone Station</div>
    ${routeRows}
    <div class="legend-heading">Food insecurity (IPC classification)</div>
    ${foodSecurityRows}
    <div class="legend-row"><span class="swatch" style="background:${NO_DATA_COLOR}"></span>No data</div>
    <p class="tagline">Admin1 (state/province) detail where available, country-level otherwise. Region classified at the highest IPC phase reaching 20% of its population.</p>
    <div class="legend-heading">Starvation zones</div>
    <div class="legend-row"><span class="swatch" style="background:${IPC_PHASE_COLORS[4]}"></span>Highlighted district, Phase 4+</div>
    <p class="tagline">Localized (admin2) areas where Emergency or Catastrophe/Famine reaches 20% of the population, highlighted over the real district shape where known — often masked by a lower country/region-level average.</p>
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
  | { type: "ring"; data: RingDatum }
  | { type: "moving"; data: { mode: DeliveryMode; fromName: string; toName: string } }
  | { type: "satellite"; data: { index: number } }
  | {
      type: "capsule";
      data: { targetName: string; targetLat: number; targetLng: number; startMs: number; durationMs: number };
    }
  | { type: "beam"; data: { hubName: string } }
  | { type: "country"; data: CountryFeature }
  | { type: "admin1"; data: Admin1Feature }
  | { type: "zone"; data: StarvationZone }
  | { type: "droneStation"; data: DroneStation };

function resolveSelectable(object: THREE.Object3D): SelectableHit | null {
  let obj: THREE.Object3D | null = object;
  while (obj && obj !== globe) {
    const userType = obj.userData?.selectableType as SelectableHit["type"] | undefined;
    if (userType) {
      return { type: userType, data: obj.userData.selectableData } as SelectableHit;
    }
    const extras = obj as unknown as GlobeObjectExtras;
    if (extras.__data !== undefined) {
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

function pointInPolygon(lat: number, lng: number, geometry: GeoJsonGeometry): boolean {
  return geometryPolygons(geometry).some((polygon) => ringContains(polygon[0], lng, lat));
}

// Simple angular-distance check against the same ellipse radius the bake
// script used (FALLBACK_ZONE_RADIUS_DEG / ellipse_ring) — matches the
// baked circle closely enough for click purposes without needing to ship
// the ellipse's exact vertex ring to the client.
function withinFallbackZone(lat: number, lng: number, zone: StarvationZone): boolean {
  if (zone.fallbackRadiusDeg == null) return false;
  return Math.hypot(lat - zone.lat, lng - zone.lng) <= zone.fallbackRadiusDeg;
}

function resolveRegionAt(lat: number, lng: number): SelectableHit | null {
  // Starvation zones first — the most specific, most severe layer, baked
  // on top of everything else visually, so a click should prefer it over
  // the admin1/country fill underneath.
  for (const zone of starvationZones) {
    if (zone.fallbackRadiusDeg == null) {
      const boundary = zoneBoundaryById.get(zone.id);
      if (boundary && pointInPolygon(lat, lng, boundary.geometry)) return { type: "zone", data: zone };
    } else if (withinFallbackZone(lat, lng, zone)) {
      return { type: "zone", data: zone };
    }
  }
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

// "this entire network communicates wirelessly and wired using whatever
// super secure mesh networking we can put everywhere" — data-level for
// now, deliberately not a new rendered layer (a globe-spanning mesh of
// connecting lines between every hub/station/satellite would reintroduce
// the kind of heavy geometry that crashed Chromium earlier this session,
// for a feature that's still just a description, not a modeled system).
// Every infrastructure node's info panel gets this same row.
const MESH_COMMS_NOTE = "Secure encrypted P2P mesh, wireless + wired";

function describeSelection(hit: SelectableHit): SelectionInfo {
  switch (hit.type) {
    case "node": {
      const node = hit.data;
      const typeLabel = HUB_TYPE_LABELS[node.hubType];
      if (node.hubType === "ocean_farm") {
        return {
          title: node.name,
          subtitle: typeLabel,
          rows: [
            ["Crops", OCEAN_FARM_CROPS],
            ["Solar capacity", "~15 MW peak (~0.2 km² floating array)"],
            ["Footprint", "~1 km² (60 km kelp line, 20 km dulse line)"],
            ["Food grown so far (real time, unbounded)", `${(oceanFarmFoodGrownGrams(latestElapsedMs) / 1000).toFixed(1)} kg`],
            ["Microplastic captured so far (real time, unbounded)", `${(oceanFarmMicroplasticGrams(latestElapsedMs) / 1000).toFixed(2)} kg`],
            ["Coordinates", `${node.lat.toFixed(2)}, ${node.lng.toFixed(2)}`],
            ["Comms", MESH_COMMS_NOTE],
            ["Design reference", "docs/OCEAN_FARM.md"],
          ],
        };
      }
      return {
        title: node.name,
        subtitle: typeLabel,
        rows: [
          ["Type", typeLabel],
          ["Coordinates", `${node.lat.toFixed(2)}, ${node.lng.toFixed(2)}`],
          ["Comms", MESH_COMMS_NOTE],
        ],
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
          ["Comms", MESH_COMMS_NOTE],
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
    case "zone": {
      const zone = hit.data;
      const locationLabel = [zone.admin1Name, zone.countryName].filter(Boolean).join(", ");
      const phaseOrder = ["1", "2", "3", "4", "5"];
      const phaseRows: Array<[string, string]> = phaseOrder
        .filter((phaseNum) => zone.phases[phaseNum])
        .map((phaseNum) => {
          const phase = zone.phases[phaseNum];
          return [`IPC Phase ${phaseNum} — ${phase.label}`, `${phase.population.toLocaleString()} (${Math.round(phase.fraction * 100)}%)`];
        });
      const precisionLabel =
        zone.locationSource === "admin2"
          ? "Real district (admin2) boundary shape"
          : zone.locationSource === "admin1"
            ? `Approximate — district boundary unmatched, highlighted as a ${zone.fallbackRadiusDeg}° circle around the admin1 region's centroid`
            : `Approximate — no finer boundary matched, highlighted as a ${zone.fallbackRadiusDeg}° circle around the country's centroid`;
      return {
        title: zone.admin2Name,
        subtitle: `Starvation zone — IPC Phase ${zone.areaPhase} (${IPC_PHASE_LABELS[zone.areaPhase]}), ${zone.periodStart} to ${zone.periodEnd}`,
        rows: [
          ["Location", locationLabel],
          ["Population analyzed", zone.populationAnalyzed.toLocaleString()],
          ["Phase 4+5 (Emergency or worse)", `${Math.round(zone.phase4PlusFraction * 100)}%`],
          ["Phase 5 (Catastrophe/Famine)", `${Math.round(zone.phase5Fraction * 100)}%`],
          ...phaseRows,
          ["Highlight shape", precisionLabel],
          ["Source", "HDX HAPI Food Security"],
        ],
      };
    }
    case "droneStation": {
      const station = hit.data;
      return {
        title: station.name,
        subtitle: "Autonomous electric drone launch/charging station",
        rows: [
          ["Payload", "~8 kg dehydrated food product per flight"],
          ["Range", "~120 km one-way (precision parachute drop, no landing)"],
          ["Power", "~50 kW solar + ~10 kW wind, battery buffered"],
          ["Cargo", "Food only — no weapons, no surveillance payload, humanitarian delivery exclusively"],
          ["Coordinates", `${station.lat.toFixed(2)}, ${station.lng.toFixed(2)}`],
          ["Comms", MESH_COMMS_NOTE],
          ["Design reference", "docs/DRONE_DELIVERY.md"],
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

// --- Verification ledger ---------------------------------------------------
// "we randomly choose shipments to verify and post this to some type of
// public ledger" — a local hash-chained ledger (SHA-256 via the Web Crypto
// API), each entry linked to the previous one's hash, structured so it
// could be handed to a real P2P blockchain API later without changing the
// record shape. submitToBlockchain() below is that future integration
// point — it only logs right now. Deliberately not wired to any live
// network: actually posting somewhere is a real, consequential action this
// simulation shouldn't take on its own. Shallow, no dedicated UI yet —
// inspect the running ledger via `window.__ledger` in the browser console.

interface LedgerEntry {
  index: number;
  timestampMs: number;
  routeId: string;
  detail: string;
  previousHash: string;
  hash: string;
}

const ledger: LedgerEntry[] = [];

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function submitToBlockchain(entry: LedgerEntry): void {
  console.log("[ledger] would submit to P2P blockchain API:", entry);
}

async function verifyRandomShipment(): Promise<void> {
  if (routes.length === 0) return;
  const route = routes[Math.floor(Math.random() * routes.length)];
  const previous = ledger[ledger.length - 1];
  const previousHash = previous ? previous.hash : "0".repeat(64);
  const index = ledger.length;
  const timestampMs = Date.now();
  const detail = `Verified ${route.mode} shipment ${route.id} -> ${route.toName}`;
  const hash = await sha256Hex(`${index}|${timestampMs}|${route.id}|${previousHash}`);
  const entry: LedgerEntry = { index, timestampMs, routeId: route.id, detail, previousHash, hash };
  ledger.push(entry);
  submitToBlockchain(entry);
}

// Verification cadence is independent of SHOW_DELIVERIES — network
// integrity checking isn't gated on whether delivery motion happens to be
// visible right now.
const LEDGER_VERIFICATION_INTERVAL_MS = 45000;
verifyRandomShipment().catch((err) => console.error("[ledger] verification failed:", err));
setInterval(() => {
  verifyRandomShipment().catch((err) => console.error("[ledger] verification failed:", err));
}, LEDGER_VERIFICATION_INTERVAL_MS);

declare global {
  interface Window {
    __ledger?: LedgerEntry[];
  }
}
window.__ledger = ledger;
