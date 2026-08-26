/* Behaviour lock: building grid must match a full scan; compactByLife keeps the same survivors. */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const ctx = { console: console, Math: Math, Set: Set, Map: Map, Infinity: Infinity };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'js/config.js'), 'utf8'), ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'js/world.js'), 'utf8'), ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'js/spatial.js'), 'utf8'), ctx);

function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'assertion failed');
}

function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeBuildings(rng, n) {
  const buildings = [];
  for (let i = 0; i < n; i++) {
    buildings.push({
      x: rng() * 1800,
      y: rng() * 1800,
      w: 40 + rng() * 120,
      h: 40 + rng() * 100,
    });
  }
  return buildings;
}

function linearHits(buildings, x1, y1, x2, y2) {
  for (let i = 0; i < buildings.length; i++) {
    const b = buildings[i];
    if (ctx.segmentRect(x1, y1, x2, y2, b.x, b.y, b.w, b.h)) return true;
  }
  return false;
}

function linearOverlap(buildings, x, y, pad) {
  for (let i = 0; i < buildings.length; i++) {
    const b = buildings[i];
    if (x > b.x - pad && x < b.x + b.w + pad && y > b.y - pad && y < b.y + b.h + pad) {
      return true;
    }
  }
  return false;
}

const rng = mulberry32(20260826);
const buildings = makeBuildings(rng, 80);
ctx.attachBuildingGrid(buildings);

let rays = 0;
let hits = 0;
for (let i = 0; i < 400; i++) {
  const x1 = rng() * 2000;
  const y1 = rng() * 2000;
  const x2 = rng() * 2000;
  const y2 = rng() * 2000;
  const gridHit = ctx.lineHitsBuilding(x1, y1, x2, y2, buildings);
  const fullHit = linearHits(buildings, x1, y1, x2, y2);
  assert(gridHit === fullHit, 'lineHitsBuilding mismatch at ray ' + i);
  rays++;
  if (gridHit) hits++;
}

let points = 0;
for (let i = 0; i < 400; i++) {
  const x = rng() * 2000;
  const y = rng() * 2000;
  const grid = ctx.buildingOverlapsPoint(buildings, x, y, 20);
  const full = linearOverlap(buildings, x, y, 20);
  assert(grid === full, 'buildingOverlapsPoint mismatch at point ' + i);
  points++;
}

const entity = { x: 400, y: 400, r: 14 };
const before = { x: entity.x, y: entity.y };
ctx.resolveCircleBuilding(entity, buildings);
assert(Number.isFinite(entity.x) && Number.isFinite(entity.y), 'resolve produced NaN');
assert(entity.x !== undefined, 'entity lost x');
assert(before.x === 400, 'fixture mutated unexpectedly');

const fx = [
  { life: 0.2, vx: 1, vy: 2, x: 0, y: 0 },
  { life: 0.01, vx: 0, vy: 0, x: 3, y: 4 },
  { life: 0.5, vx: -1, vy: 0, x: 8, y: 1 },
];
ctx.compactByLife(fx, 0.02, true);
assert(fx.length === 2, 'compactByLife should drop expired dust, got ' + fx.length);
assert(fx[0].life > 0 && fx[1].life > 0, 'survivors must have positive life');
assert(Math.abs(fx[0].x - 0.02) < 1e-9, 'dust x integration drifted');

console.log('ok spatial rays=' + rays + ' hits=' + hits + ' points=' + points);
