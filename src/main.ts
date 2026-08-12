import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import ThreeGlobe from "three-globe";
import { nodes, nodeById, type DeliveryNode } from "./data/nodes";
import { routes } from "./data/routes";
import { MODE_STYLES, type DeliveryMode } from "./data/modes";
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
controls.minDistance = 104;
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

const arcsData = surfaceRoutes.map((r) => {
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
  };
});

// Knowledge-broadcast routes render as pulsing rings on the destination
// (non-physical delivery has no path to draw).
const instructionTargets = new Map<string, DeliveryMode>();
for (const r of instructionRoutes) instructionTargets.set(r.to, r.mode);
const ringsData = [...instructionTargets.entries()].map(([nodeId, mode]) => {
  const node = nodeById.get(nodeId)!;
  const style = MODE_STYLES[mode];
  return {
    lat: node.lat,
    lng: node.lng,
    color: style.color[0],
  };
});

const HUB_TYPE_COLORS: Record<string, string> = {
  port: "#38bdf8",
  air: "#fbbf24",
  space: "#a78bfa",
  depot: "#2dd4bf",
};

function getPointColor(node: DeliveryNode): string {
  if (node.kind === "hub") return HUB_TYPE_COLORS[node.hubType ?? "port"];
  const level = node.needLevel ?? 0.5;
  // Interpolate amber -> red as need severity rises.
  return level > 0.8 ? "#ef4444" : level > 0.6 ? "#f97316" : "#f59e0b";
}

const globe = new ThreeGlobe()
  .globeImageUrl("https://unpkg.com/three-globe/example/img/earth-night.jpg")
  .bumpImageUrl("https://unpkg.com/three-globe/example/img/earth-topology.png")
  .showAtmosphere(true)
  .atmosphereColor("#60a5fa")
  .atmosphereAltitude(0.18)
  .pointsData(nodes)
  .pointLat("lat")
  .pointLng("lng")
  .pointColor((d) => getPointColor(d as DeliveryNode))
  .pointAltitude((d) => ((d as DeliveryNode).kind === "hub" ? 0.012 : 0.02))
  .pointRadius((d) => ((d as DeliveryNode).kind === "hub" ? 0.35 : 0.3 + ((d as DeliveryNode).needLevel ?? 0.5) * 0.4))
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

function makeModeMesh(mode: DeliveryMode): THREE.Object3D {
  const style = MODE_STYLES[mode];
  const color = new THREE.Color(style.color[0]);
  const material = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.8,
    roughness: 0.35,
    metalness: 0.1,
  });
  const size = 2.2;
  let geometry: THREE.BufferGeometry;
  switch (mode) {
    case "space":
      geometry = new THREE.IcosahedronGeometry(size * 0.7, 0);
      break;
    case "plane":
      geometry = new THREE.OctahedronGeometry(size * 0.75, 0);
      break;
    case "ship":
      geometry = new THREE.BoxGeometry(size, size * 0.55, size);
      break;
    case "catapult":
      geometry = new THREE.TetrahedronGeometry(size * 0.85, 0);
      break;
    default:
      geometry = new THREE.SphereGeometry(size * 0.55, 8, 8);
  }
  return new THREE.Mesh(geometry, material);
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
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.6, roughness: 0.4 });
  const panelMat = new THREE.MeshStandardMaterial({
    color: 0x1d4ed8,
    metalness: 0.2,
    roughness: 0.5,
    emissive: 0x1d4ed8,
    emissiveIntensity: 0.15,
  });
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 2.2), bodyMat);
  group.add(body);
  const panelGeometry = new THREE.BoxGeometry(4, 0.08, 1.4);
  const panelLeft = new THREE.Mesh(panelGeometry, panelMat);
  panelLeft.position.x = -3;
  const panelRight = new THREE.Mesh(panelGeometry, panelMat);
  panelRight.position.x = 3;
  group.add(panelLeft, panelRight);
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

const satellites: Satellite[] = SHOW_DISTRIBUTION_ROUTES
  ? Array.from({ length: SATELLITE_COUNT }, (_, i) => {
      const mesh = makeSatelliteMesh();
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
    globe.add(new THREE.Line(geometry, material));
  }
}

interface CapsuleSpawner {
  targetLat: number;
  targetLng: number;
  cadenceMs: number;
  nextLaunchMs: number;
  durationMs: number;
}

const capsuleSpawners: CapsuleSpawner[] = spaceRoutes.map((r, i) => {
  const to = nodeById.get(r.to)!;
  return {
    targetLat: to.lat,
    targetLng: to.lng,
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
  const material = new THREE.MeshStandardMaterial({
    color: 0xe0f2fe,
    emissive: 0x7dd3fc,
    emissiveIntensity: 0.7,
    roughness: 0.3,
  });
  const mesh = new THREE.Mesh(new THREE.ConeGeometry(1.1, 2.6, 6), material);
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

renderer.setAnimationLoop(() => {
  const elapsedMs = clock.getElapsedTime() * 1000;

  for (const obj of movingObjects) {
    const t = ((elapsedMs + obj.offsetMs) % obj.durationMs) / obj.durationMs;
    obj.mesh.position.copy(obj.curve.getPoint(t));
  }

  for (const sat of satellites) {
    sat.mesh.position.copy(satellitePosition(sat, elapsedMs));
    sat.mesh.lookAt(0, 0, 0);
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

const HUB_TYPE_LABELS: Record<string, string> = {
  port: "Sea Port",
  air: "Air Cargo Hub",
  space: "Launch Site",
  depot: "Humanitarian Depot",
};

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

  legend.innerHTML = `
    <h1>Food Relief Network</h1>
    <p class="tagline">Global hub network — every delivery mode active.</p>
    ${hubRows}
    ${routeRows}
  `;
  document.body.appendChild(legend);
}
