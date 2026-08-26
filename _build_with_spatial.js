'use strict';

const fs = require('fs');
const path = require('path');
const Module = require('module');

const srcPath = path.join(__dirname, '_build_single.js');
const src = fs.readFileSync(srcPath, 'utf8').replace(
  "'game.js', 'spawn_spacing.js'",
  "'game.js', 'spatial.js', 'spawn_spacing.js'"
);
if (src.indexOf("'spatial.js'") < 0) {
  console.error('could not inject spatial.js into _build_single.js');
  process.exit(1);
}

const mod = new Module(srcPath);
mod.filename = srcPath;
mod.paths = Module._nodeModulePaths(__dirname);
mod._compile(src, srcPath);
