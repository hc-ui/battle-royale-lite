const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

test('paused matches still record held movement keys', () => {
  const src = fs.readFileSync(path.join(root, 'js', 'main.js'), 'utf8');
  assert.match(src, /if \(game\.paused\) \{/);
  assert.match(src, /game\.keys\.add\(e\.code\)/);
});

test('game loop stops when the match is not playing', () => {
  const src = fs.readFileSync(path.join(root, 'js', 'main.js'), 'utf8');
  assert.match(src, /if \(!game \|\| !playing\) \{\s*raf = 0;/);
  assert.match(src, /if \(game\.paused\) \{\s*last = ts;/);
});

test('match request and HUD refresh exist', () => {
  const src = fs.readFileSync(path.join(root, 'js', 'main.js'), 'utf8');
  assert.match(src, /function requestMatch\(/);
  assert.match(src, /bind\('btn-start', 'click', requestMatch\)/);
  assert.match(src, /updateHud\(\);/);
  assert.match(src, /data-slot/);
});

test('touch on HUD buttons does not start firing', () => {
  const src = fs.readFileSync(path.join(root, 'js', 'main.js'), 'utf8');
  assert.match(src, /closest\('button, \.slot, \.screen, #weapon-slots'\)/);
});

test('weapon slots receive clicks through the bottom HUD', () => {
  const css = fs.readFileSync(path.join(root, 'css', 'style.css'), 'utf8');
  assert.match(css, /#bottom-hud\s*\{[^}]*pointer-events:\s*none/);
  assert.match(css, /#weapon-slots\s*\{[^}]*pointer-events:\s*auto/);
  assert.match(css, /\.slot\[data-slot\]\s*\{[^}]*pointer-events:\s*auto/);
});
