import * as THREE from "three";

// Every sprite in this simulation (hub/need markers, moving delivery
// objects, satellites, deorbit capsules) is a set of line segments radiating
// from a shared center point — literal line intersections rather than solid
// meshes. Each shape below is a named vertex-direction family (drawn from a
// regular polyhedron's vertices) so the visual vocabulary stays small and
// mathematically consistent instead of one-off geometry per object.
export type LineShapeKind = "cross6" | "tetraX" | "cubeStar" | "star12";

function dir(x: number, y: number, z: number): THREE.Vector3 {
  return new THREE.Vector3(x, y, z).normalize();
}

// 6 arms along +/-X, +/-Y, +/-Z (octahedron vertices) — reads as a 3D "+".
const cross6: THREE.Vector3[] = [
  dir(1, 0, 0),
  dir(-1, 0, 0),
  dir(0, 1, 0),
  dir(0, -1, 0),
  dir(0, 0, 1),
  dir(0, 0, -1),
];

// 4 arms toward tetrahedron vertices — reads as a sharp X/pyramid star.
const tetraX: THREE.Vector3[] = [
  dir(1, 1, 1),
  dir(1, -1, -1),
  dir(-1, 1, -1),
  dir(-1, -1, 1),
];

// 8 arms toward cube vertices — a denser diamond lattice.
const cubeStar: THREE.Vector3[] = [
  dir(1, 1, 1),
  dir(1, 1, -1),
  dir(1, -1, 1),
  dir(1, -1, -1),
  dir(-1, 1, 1),
  dir(-1, 1, -1),
  dir(-1, -1, 1),
  dir(-1, -1, -1),
];

// 12 arms toward icosahedron vertices — a dense spiky burst.
const PHI = (1 + Math.sqrt(5)) / 2;
const star12: THREE.Vector3[] = [
  dir(0, 1, PHI),
  dir(0, 1, -PHI),
  dir(0, -1, PHI),
  dir(0, -1, -PHI),
  dir(1, PHI, 0),
  dir(1, -PHI, 0),
  dir(-1, PHI, 0),
  dir(-1, -PHI, 0),
  dir(PHI, 0, 1),
  dir(PHI, 0, -1),
  dir(-PHI, 0, 1),
  dir(-PHI, 0, -1),
];

const SHAPE_DIRECTIONS: Record<LineShapeKind, THREE.Vector3[]> = {
  cross6,
  tetraX,
  cubeStar,
  star12,
};

export function buildLineShape(
  kind: LineShapeKind,
  size: number,
  color: THREE.ColorRepresentation,
): THREE.LineSegments {
  const directions = SHAPE_DIRECTIONS[kind];
  const points: THREE.Vector3[] = [];
  for (const direction of directions) {
    points.push(new THREE.Vector3(0, 0, 0), direction.clone().multiplyScalar(size));
  }
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.95 });
  return new THREE.LineSegments(geometry, material);
}
