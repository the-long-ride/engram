// Pure layout and edge-path helpers for the memories graph.
import type { MemoryLink, MemoryNode, NodeBox } from './graph-types.js';

type Point = { x: number; y: number; vx: number; vy: number; component: number };

const NODE_W = 190;
const NODE_H = 76;
const NODE_GAP = 22;
const MIN_EDGE = 128;
const LINK_EDGE = 144;

export function layoutMemoryGraph(nodes: MemoryNode[], links: MemoryLink[] = []): { positions: Record<string, NodeBox>; width: number; height: number } {
  const ids = nodes.map((node) => node.id);
  const idSet = new Set(ids);
  const neighbors = new Map<string, Set<string>>();
  for (const id of ids) neighbors.set(id, new Set());
  for (const link of links) {
    if (!idSet.has(link.from) || !idSet.has(link.to)) continue;
    neighbors.get(link.from)?.add(link.to);
    neighbors.get(link.to)?.add(link.from);
  }

  const componentById = connectedComponents(ids, neighbors);
  const components = Math.max(1, ...Object.values(componentById).map((value) => value + 1));
  const width = Math.max(780, Math.ceil(Math.sqrt(Math.max(nodes.length, 1))) * 265 + Math.min(components, 3) * 70);
  const height = Math.max(500, Math.ceil(nodes.length / Math.max(1, Math.floor(width / 245))) * 176 + Math.min(components, 3) * 44);
  const centers = componentCenters(components, width, height);
  const points: Record<string, Point> = {};
  const componentSizes = componentCounts(componentById);
  const componentSlots: Record<number, number> = {};

  nodes.forEach((node, index) => {
    const component = componentById[node.id] ?? index;
    const center = centers[component] ?? { x: width / 2, y: height / 2 };
    const slot = componentSlots[component] ?? 0;
    componentSlots[component] = slot + 1;
    const size = componentSizes[component] || 1;
    const angle = (Math.PI * 2 * slot) / size + seededAngle(node.id, index) * 0.08;
    const ring = Math.max(1, Math.ceil(Math.sqrt(size)));
    const radius = size === 1 ? (neighbors.get(node.id)?.size ? 34 : 118) : 46 + Math.floor(slot / ring) * 42;
    points[node.id] = {
      x: center.x + Math.cos(angle) * radius,
      y: center.y + Math.sin(angle) * radius,
      vx: 0,
      vy: 0,
      component
    };
  });

  for (let tick = 0; tick < 220; tick += 1) {
    applyForces(ids, links, neighbors, points, centers, width, height, tick);
    resolveCollisions(ids, points, width, height, 0.72);
  }
  for (let tick = 0; tick < 32; tick += 1) resolveCollisions(ids, points, width, height, 1);

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

function connectedComponents(ids: string[], neighbors: Map<string, Set<string>>): Record<string, number> {
  const componentById: Record<string, number> = {};
  let component = 0;
  for (const id of ids) {
    if (componentById[id] !== undefined) continue;
    const stack = [id];
    componentById[id] = component;
    while (stack.length) {
      const current = stack.pop() || '';
      for (const next of neighbors.get(current) ?? []) {
        if (componentById[next] !== undefined) continue;
        componentById[next] = component;
        stack.push(next);
      }
    }
    component += 1;
  }
  return componentById;
}

function componentCenters(count: number, width: number, height: number): Array<{ x: number; y: number }> {
  const cx = width / 2, cy = height / 2;
  if (count === 1) return [{ x: cx, y: cy }];
  const spacing = Math.min(245, Math.max(170, Math.min(width, height) / Math.max(2.4, Math.sqrt(count) + 0.6)));
  return Array.from({ length: count }, (_, index) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / count;
    const ring = Math.floor(index / 8);
    const radius = spacing * (0.72 + ring * 0.5);
    return {
      x: clamp(cx + Math.cos(angle) * radius, NODE_W, width - NODE_W),
      y: clamp(cy + Math.sin(angle) * radius, NODE_H + 36, height - NODE_H)
    };
  });
}

function componentCounts(componentById: Record<string, number>): Record<number, number> {
  const counts: Record<number, number> = {};
  for (const component of Object.values(componentById)) counts[component] = (counts[component] ?? 0) + 1;
  return counts;
}

function applyForces(
  ids: string[],
  links: MemoryLink[],
  neighbors: Map<string, Set<string>>,
  points: Record<string, Point>,
  centers: Array<{ x: number; y: number }>,
  width: number,
  height: number,
  tick: number
): void {
  for (let i = 0; i < ids.length; i += 1) {
    for (let j = i + 1; j < ids.length; j += 1) {
      const a = points[ids[i]], b = points[ids[j]];
      const dx = b.x - a.x || 0.01, dy = b.y - a.y || 0.01;
      const distSq = Math.max(100, dx * dx + dy * dy);
      const sameComponent = a.component === b.component;
      const force = (sameComponent ? 2500 : 4100) / distSq;
      const fx = dx * force, fy = dy * force;
      a.vx -= fx; a.vy -= fy; b.vx += fx; b.vy += fy;
    }
  }

  for (const link of links) {
    const a = points[link.from], b = points[link.to];
    if (!a || !b) continue;
    const dx = b.x - a.x || 0.01, dy = b.y - a.y || 0.01;
    const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
    const target = link.thin ? LINK_EDGE : MIN_EDGE;
    const strength = link.thin ? 0.038 : 0.072;
    const force = (dist - target) * strength;
    const fx = (dx / dist) * force, fy = (dy / dist) * force;
    a.vx += fx; a.vy += fy; b.vx -= fx; b.vy -= fy;
  }

  for (const id of ids) {
    const point = points[id];
    const center = centers[point.component] ?? { x: width / 2, y: height / 2 };
    const connected = (neighbors.get(id)?.size ?? 0) > 0;
    const gravity = connected ? 0.026 : 0.01;
    point.vx += (center.x - point.x) * gravity;
    point.vy += (center.y - point.y) * gravity;
    point.vx += (width / 2 - point.x) * 0.003;
    point.vy += (height / 2 - point.y) * 0.003;
    const cooling = Math.max(0.32, 0.86 - tick * 0.0016);
    point.vx *= cooling;
    point.vy *= cooling;
    point.x = clamp(point.x + point.vx, NODE_W / 2 + 24, width - NODE_W / 2 - 24);
    point.y = clamp(point.y + point.vy, NODE_H / 2 + 48, height - NODE_H / 2 - 24);
  }
}

function resolveCollisions(ids: string[], points: Record<string, Point>, width: number, height: number, strength: number): void {
  const minX = NODE_W + NODE_GAP;
  const minY = NODE_H + NODE_GAP;
  for (let i = 0; i < ids.length; i += 1) {
    for (let j = i + 1; j < ids.length; j += 1) {
      const a = points[ids[i]], b = points[ids[j]];
      const dx = b.x - a.x || seededJitter(ids[i], ids[j], 'x');
      const dy = b.y - a.y || seededJitter(ids[i], ids[j], 'y');
      const overlapX = minX - Math.abs(dx);
      const overlapY = minY - Math.abs(dy);
      if (overlapX <= 0 || overlapY <= 0) continue;
      if (overlapX < overlapY) {
        const shift = (overlapX / 2 + 0.5) * Math.sign(dx) * strength;
        a.x -= shift; b.x += shift;
      } else {
        const shift = (overlapY / 2 + 0.5) * Math.sign(dy) * strength;
        a.y -= shift; b.y += shift;
      }
      a.x = clamp(a.x, NODE_W / 2 + 24, width - NODE_W / 2 - 24);
      b.x = clamp(b.x, NODE_W / 2 + 24, width - NODE_W / 2 - 24);
      a.y = clamp(a.y, NODE_H / 2 + 48, height - NODE_H / 2 - 24);
      b.y = clamp(b.y, NODE_H / 2 + 48, height - NODE_H / 2 - 24);
    }
  }
}

function seededJitter(a: string, b: string, axis: string): number {
  return Math.sin(seededAngle(a + b + axis, 0)) || 0.01;
}

export function edgePath(a: NodeBox, b: NodeBox): string {
  const ac = center(a), bc = center(b);
  const start = boundaryPoint(a, bc.x - ac.x, bc.y - ac.y, 6);
  const end = boundaryPoint(b, ac.x - bc.x, ac.y - bc.y, 14);
  return 'M ' + start.x + ' ' + start.y + ' L ' + end.x + ' ' + end.y;
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