/** Spatial index + particle compact — same hits as a full building scan. */

var BUILDING_CELL = 160;

function buildingCellKey(cx, cy) {
  return cx + ':' + cy;
}

function attachBuildingGrid(buildings) {
  var cell = BUILDING_CELL;
  var cells = {};
  for (var i = 0; i < buildings.length; i++) {
    var b = buildings[i];
    var x0 = Math.floor(b.x / cell);
    var y0 = Math.floor(b.y / cell);
    var x1 = Math.floor((b.x + b.w) / cell);
    var y1 = Math.floor((b.y + b.h) / cell);
    for (var cx = x0; cx <= x1; cx++) {
      for (var cy = y0; cy <= y1; cy++) {
        var k = buildingCellKey(cx, cy);
        var bucket = cells[k];
        if (!bucket) {
          bucket = [];
          cells[k] = bucket;
        }
        bucket.push(b);
      }
    }
  }
  buildings._grid = { cell: cell, cells: cells };
  return buildings;
}

function queryBuildingsRect(buildings, minX, minY, maxX, maxY) {
  var grid = buildings && buildings._grid;
  if (!grid) return buildings;
  var cell = grid.cell;
  var x0 = Math.floor(minX / cell);
  var y0 = Math.floor(minY / cell);
  var x1 = Math.floor(maxX / cell);
  var y1 = Math.floor(maxY / cell);
  var out = [];
  var seen = new Set();
  for (var cx = x0; cx <= x1; cx++) {
    for (var cy = y0; cy <= y1; cy++) {
      var bucket = grid.cells[buildingCellKey(cx, cy)];
      if (!bucket) continue;
      for (var i = 0; i < bucket.length; i++) {
        var b = bucket[i];
        if (seen.has(b)) continue;
        seen.add(b);
        out.push(b);
      }
    }
  }
  return out;
}

function buildingOverlapsPoint(buildings, x, y, pad) {
  var list = queryBuildingsRect(buildings, x - pad, y - pad, x + pad, y + pad);
  for (var i = 0; i < list.length; i++) {
    var b = list[i];
    if (x > b.x - pad && x < b.x + b.w + pad && y > b.y - pad && y < b.y + b.h + pad) {
      return true;
    }
  }
  return false;
}

function compactByLife(arr, dt, moveDust) {
  var w = 0;
  for (var i = 0; i < arr.length; i++) {
    var item = arr[i];
    item.life -= dt;
    if (moveDust) {
      item.x += item.vx * dt;
      item.y += item.vy * dt;
    }
    if (item.life > 0) arr[w++] = item;
  }
  arr.length = w;
}

if (typeof createWorld === 'function') {
  var _createWorld = createWorld;
  createWorld = function () {
    var world = _createWorld();
    attachBuildingGrid(world.buildings);
    return world;
  };
}

if (typeof lineHitsBuilding === 'function') {
  var _lineHitsBuilding = lineHitsBuilding;
  lineHitsBuilding = function (x1, y1, x2, y2, buildings) {
    if (!buildings || !buildings._grid) {
      return _lineHitsBuilding(x1, y1, x2, y2, buildings);
    }
    var list = queryBuildingsRect(
      buildings,
      Math.min(x1, x2) - 1,
      Math.min(y1, y2) - 1,
      Math.max(x1, x2) + 1,
      Math.max(y1, y2) + 1
    );
    for (var i = 0; i < list.length; i++) {
      var b = list[i];
      if (segmentRect(x1, y1, x2, y2, b.x, b.y, b.w, b.h)) return true;
    }
    return false;
  };
}

if (typeof Game === 'function') {
  Game.prototype.aliveCount = function () {
    var n = this.player.alive ? 1 : 0;
    for (var i = 0; i < this.bots.length; i++) {
      if (this.bots[i].alive) n++;
    }
    return n;
  };
}
