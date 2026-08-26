const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.join(__dirname, '..');

test('single-file build lists opening_grace after game modules', () => {
  const src = fs.readFileSync(path.join(root, '_build_single.js'), 'utf8');
  assert.match(src, /opening_grace\.js/);
  const list = src.match(/const jsFiles = \[([^\]]+)\]/);
  assert.ok(list, 'jsFiles list missing');
  assert.ok(list[1].indexOf('game.js') < list[1].indexOf('opening_grace.js'));
  assert.ok(list[1].indexOf('opening_grace.js') < list[1].indexOf('main.js'));
});

test('game reset passes existing bots into createBot', () => {
  const src = fs.readFileSync(path.join(root, 'js', 'game.js'), 'utf8');
  assert.match(src, /createBot\(this\.buildings, ppos, this\.bots\)/);
});

test('spatial wrapper still injects spatial.js in front of spawn_spacing', () => {
  const single = fs.readFileSync(path.join(root, '_build_single.js'), 'utf8');
  const wrap = fs.readFileSync(path.join(root, '_build_with_spatial.js'), 'utf8');
  assert.match(single, /'game\.js', 'spawn_spacing\.js'/);
  assert.match(wrap, /spatial\.js/);
});

test('production bundle includes opening grace and spatial grid', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'br-lite-build-'));
  const copy = (rel) => {
    const dest = path.join(tmp, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(path.join(root, rel), dest);
  };
  copy('_build_single.js');
  copy('_build_with_spatial.js');
  copy('css/style.css');
  for (const name of fs.readdirSync(path.join(root, 'js'))) {
    copy(path.join('js', name));
  }
  const result = spawnSync(process.execPath, ['_build_with_spatial.js'], {
    cwd: tmp,
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const html = fs.readFileSync(path.join(tmp, 'index.html'), 'utf8');
  assert.match(html, /openingGracePatch/);
  assert.match(html, /attachBuildingGrid/);
  assert.match(html, /match-overlay/);
});
