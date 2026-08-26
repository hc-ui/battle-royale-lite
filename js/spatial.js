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
