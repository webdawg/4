import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import ThreeGlobe from "three-globe";
import { nodes, nodeById, type DeliveryNode } from "./data/nodes";
import { routes } from "./data/routes";
import { MODE_STYLES, type DeliveryMode } from "./data/modes";
import "./style.css";

const app = document.querySelector<HTMLDivElement>("#app")!;
app.innerHTML = `<canvas id="globe-canvas"></canvas>`;
buildLegend();

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
controls.minDistance = 150;
controls.maxDistance = 800;
controls.rotateSpeed = 0.4;

// --- Globe -----------------------------------------------------------

const physicalRoutes = routes.filter((r) => MODE_STYLES[r.mode].isPhysical);
const instructionRoutes = routes.filter((r) => !MODE_STYLES[r.mode].isPhysical);

const arcsData = physicalRoutes.map((r) => {
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

function getPointColor(node: DeliveryNode): string {
  if (node.kind === "hub") return "#38bdf8";
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

// --- Resize + render loop ---------------------------------------------

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

renderer.setAnimationLoop(() => {
  controls.update();
  renderer.render(scene, camera);
});

// --- Legend overlay -----------------------------------------------------

function buildLegend() {
  const legend = document.createElement("div");
  legend.id = "legend";
  const rows = Object.entries(MODE_STYLES)
    .map(
      ([, style]) =>
        `<div class="legend-row"><span class="swatch" style="background:${style.color[0]}"></span>${style.label}</div>`,
    )
    .join("");
  legend.innerHTML = `
    <h1>Food Relief Network</h1>
    <p class="tagline">Simulated global delivery — every modality on the table.</p>
    ${rows}
  `;
  document.body.appendChild(legend);
}
