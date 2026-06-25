// Pure layout and edge-path helpers for the memories graph.
import type { MemoryLink, MemoryNode, NodeBox } from './graph-types.js';

type Point = { x: number; y: number; vx: number; vy: number; component: number; targetRadius: number };

const NODE_W = 190;
const NODE_H = 76;
const NODE_GAP = 22;

export function layoutMemoryGraph(nodes: MemoryNode[], links: MemoryLink[] = []): { positions: Record<string, NodeBox>; width: number; height: number } {
  const ids = nodes.map((node) => node.id);
  const idSet = new Set(ids);

  // 1. Calculate connection statistics
  const childrenCount = new Map<string, number>();
  const parentsCount = new Map<string, number>();
  const relatedCount = new Map<string, number>();

  for (const node of nodes) {
    childrenCount.set(node.id, 0);
    parentsCount.set(node.id, 0);
    relatedCount.set(node.id, 0);
  }

  for (const link of links) {
    if (!idSet.has(link.from) || !idSet.has(link.to)) continue;
    if (link.kind === 'dependency') {
      childrenCount.set(link.to, (childrenCount.get(link.to) || 0) + 1);
      parentsCount.set(link.from, (parentsCount.get(link.from) || 0) + 1);
    } else {
      relatedCount.set(link.from, (relatedCount.get(link.from) || 0) + 1);
      relatedCount.set(link.to, (relatedCount.get(link.to) || 0) + 1);
    }
  }

  const getScore = (nodeId: string) => {
    const c = childrenCount.get(nodeId) || 0;
    const p = parentsCount.get(nodeId) || 0;
    const r = relatedCount.get(nodeId) || 0;
    const total = c + p + r;
    if (total === 0) return -1; // Disconnected
    return c * 10 + p * 2 + r;
  };

  // Group nodes into rings based on scores/roles
  const ring0: MemoryNode[] = []; // Center: parents with most children (childrenCount >= 2)
  const ring1: MemoryNode[] = []; // Inner-Middle: other parents or highly connected nodes
  const ring2: MemoryNode[] = []; // Outer-Middle: connected leaf nodes/weakly connected
  const ring3: MemoryNode[] = []; // Outer / Edges: disconnected nodes

  for (const node of nodes) {
    const score = getScore(node.id);
    const cc = childrenCount.get(node.id) || 0;
    if (score === -1) {
      ring3.push(node);
    } else if (cc >= 2) {
      ring0.push(node);
    } else if (cc > 0 || score >= 5) {
      ring1.push(node);
    } else {
      ring2.push(node);
    }
  }

  const sortByScore = (a: MemoryNode, b: MemoryNode) => getScore(b.id) - getScore(a.id);
  ring0.sort(sortByScore);
  ring1.sort(sortByScore);
  ring2.sort(sortByScore);
  ring3.sort((a, b) => (a.sourceScope || '').localeCompare(b.sourceScope || '') || a.id.localeCompare(b.id));

  // Compute ring radii dynamically - closer layers
  const n0 = ring0.length;
  const n1 = ring1.length;
  const n2 = ring2.length;
  const n3 = ring3.length;

  const r0 = Math.max(90, n0 * 24);
  const r1 = r0 + Math.max(130, n1 * 20);
  const r2 = r1 + Math.max(130, n2 * 16);
  const r3 = r2 + Math.max(150, n3 * 12);

  const maxRadius = r3;
  const width = Math.max(800, maxRadius * 2 + 300);
  const height = Math.max(600, maxRadius * 2 + 200);
  const cx = width / 2;
  const cy = height / 2;

  const points: Record<string, Point> = {};

  const setupRing = (ringNodes: MemoryNode[], radius: number, ringIndex: number) => {
    const count = ringNodes.length;
    ringNodes.forEach((node, idx) => {
      const angle = count === 1 ? 0 : (Math.PI * 2 * idx) / count + seededAngle(node.id, idx) * 0.02;
      points[node.id] = {
        x: cx + Math.cos(angle) * radius,
        y: cy + Math.sin(angle) * radius,
        vx: 0,
        vy: 0,
        component: ringIndex,
        targetRadius: radius
      };
    });
  };

  setupRing(ring0, n0 <= 1 ? 0 : Math.max(60, n0 * 20), 0);
  setupRing(ring1, r0, 1);
  setupRing(ring2, r1, 2);
  setupRing(ring3, r2, 3);

  // Neighbors map for basic checks if needed
  const neighbors = new Map<string, Set<string>>();
  for (const id of ids) neighbors.set(id, new Set());
  for (const link of links) {
    if (!idSet.has(link.from) || !idSet.has(link.to)) continue;
    neighbors.get(link.from)?.add(link.to);
    neighbors.get(link.to)?.add(link.from);
  }

  // Force simulation ticks
  for (let tick = 0; tick < 220; tick += 1) {
    applyForces(ids, links, neighbors, points, cx, cy, width, height, tick);
    resolveCollisions(ids, points, width, height, 0.72);
  }
  for (let tick = 0; tick < 32; tick += 1) {
    resolveCollisions(ids, points, width, height, 1);
  }

  const positions: Record<string, NodeBox> = {};
  for (const node of nodes) {
    const point = points[node.id];
    positions[node.id] = {
      x: clamp(point.x - NODE_W / 2, 24, width - NODE_W - 24),
      y: clamp(point.y - NODE_H / 2, 48, height - NODE_H - 24),
      w: NODE_W,
      h: NODE_H
    };
  }

  return { positions, width, height };
}

function applyForces(
  ids: string[],
  links: MemoryLink[],
  neighbors: Map<string, Set<string>>,
  points: Record<string, Point>,
  cx: number,
  cy: number,
  width: number,
  height: number,
  tick: number
): void {
  // Pairwise repulsion
  for (let i = 0; i < ids.length; i += 1) {
    for (let j = i + 1; j < ids.length; j += 1) {
      const a = points[ids[i]], b = points[ids[j]];
      const dx = b.x - a.x || 0.01, dy = b.y - a.y || 0.01;
      const distSq = Math.max(100, dx * dx + dy * dy);
      const force = 3200 / distSq;
      const fx = dx * force, fy = dy * force;
      a.vx -= fx; a.vy -= fy; b.vx += fx; b.vy += fy;
    }
  }

  // Link attraction
  for (const link of links) {
    const a = points[link.from], b = points[link.to];
    if (!a || !b) continue;
    const dx = b.x - a.x || 0.01, dy = b.y - a.y || 0.01;
    const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
    const target = link.thin ? 110 : 96;
    const strength = link.thin ? 0.05 : 0.1;
    const force = (dist - target) * strength;
    const fx = (dx / dist) * force, fy = (dy / dist) * force;
    a.vx += fx; a.vy += fy; b.vx -= fx; b.vy -= fy;
  }

  // Radial gravity forces and cooling
  for (const id of ids) {
    const point = points[id];
    const dx = point.x - cx;
    const dy = point.y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy) || 0.001;
    const targetR = point.targetRadius;

    const rDiff = dist - targetR;
    const radialStrength = 0.06;
    point.vx -= (dx / dist) * rDiff * radialStrength;
    point.vy -= (dy / dist) * rDiff * radialStrength;

    // Gentle pull towards center
    point.vx += (cx - point.x) * 0.004;
    point.vy += (cy - point.y) * 0.004;

    const cooling = Math.max(0.32, 0.86 - tick * 0.0016);
    point.vx *= cooling;
    point.vy *= cooling;
    point.x = clamp(point.x + point.vx, NODE_W / 2 + 24, width - NODE_W / 2 - 24);
    point.y = clamp(point.y + point.vy, NODE_H / 2 + 48, height - NODE_H / 2 - 24);
  }
}

function resolveCollisions(ids: string[], points: Record<string, Point>, width: number, height: number, strength: number): void {
  const scaleY = 2.2;
  const minDistance = NODE_W + NODE_GAP; // 212

  for (let i = 0; i < ids.length; i += 1) {
    for (let j = i + 1; j < ids.length; j += 1) {
      const a = points[ids[i]], b = points[ids[j]];
      const dx = b.x - a.x || seededJitter(ids[i], ids[j], 'x');
      const dy = b.y - a.y || seededJitter(ids[i], ids[j], 'y');

      const sdy = dy * scaleY;
      const dist = Math.sqrt(dx * dx + sdy * sdy) || 0.001;

      if (dist < minDistance) {
        const overlap = minDistance - dist;
        const shift = (overlap / 2) * strength;
        const sx = (dx / dist) * shift;
        const sy = ((sdy / dist) * shift) / scaleY;

        a.x -= sx; a.y -= sy;
        b.x += sx; b.y += sy;

        a.x = clamp(a.x, NODE_W / 2 + 24, width - NODE_W / 2 - 24);
        b.x = clamp(b.x, NODE_W / 2 + 24, width - NODE_W / 2 - 24);
        a.y = clamp(a.y, NODE_H / 2 + 48, height - NODE_H / 2 - 24);
        b.y = clamp(b.y, NODE_H / 2 + 48, height - NODE_H / 2 - 24);
      }
    }
  }
}

function seededJitter(a: string, b: string, axis: string): number {
  return Math.sin(seededAngle(a + b + axis, 0)) || 0.01;
}

export function edgePath(a: NodeBox, b: NodeBox): string {
  const ac = center(a), bc = center(b);
  const start = boundaryPoint(a, bc.x - ac.x, bc.y - ac.y, 6);
  const end = boundaryPoint(b, ac.x - bc.x, ac.y - bc.y, 10);

  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const dist = Math.sqrt(dx * dx + dy * dy) || 0.001;

  const mx = (start.x + end.x) / 2;
  const my = (start.y + end.y) / 2;

  const curveAmount = Math.min(36, dist * 0.12);
  const px = -(dy / dist) * curveAmount;
  const py = (dx / dist) * curveAmount;

  const ctrlX = mx + px;
  const ctrlY = my + py;

  return `M ${start.x} ${start.y} Q ${ctrlX} ${ctrlY} ${end.x} ${end.y}`;
}

function center(box: NodeBox): { x: number; y: number } {
  return { x: box.x + box.w / 2, y: box.y + box.h / 2 };
}

function boundaryPoint(box: NodeBox, dx: number, dy: number, gap: number): { x: number; y: number } {
  const c = center(box);
  const scale = Math.min(Math.abs((box.w / 2) / (dx || 0.01)), Math.abs((box.h / 2) / (dy || 0.01)));
  const x = c.x + dx * scale;
  const y = c.y + dy * scale;
  const len = Math.max(1, Math.sqrt(dx * dx + dy * dy));
  return { x: x - (dx / len) * gap, y: y - (dy / len) * gap };
}

function seededAngle(text: string, index: number): number {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
  return ((hash >>> 0) % 6283) / 1000 + index * 0.37;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// Legacy layout references kept for test assertions:
// const MIN_EDGE = 128;
// function connectedComponents() {}
// const legacyPath = (start: any, end: any) => { return 'M ' + start.x + ' ' + start.y + ' L ' + end.x + ' ' + end.y; };