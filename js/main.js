const $ = function (id) { return document.getElementById(id); };

const menu = $('menu');
const hud = $('hud');
const pauseScreen = $('pause');
const resultScreen = $('result');
const canvas = $('game');
const minimap = $('minimap');
const crosshair = $('crosshair');
const ctx = canvas.getContext('2d', { alpha: false });
const mctx = minimap.getContext('2d');

let game = null;
let raf = 0;
let last = 0;
let playing = false;
let selectedDiff = 'normal';

const STORAGE_KEY = 'br_lite_v1';

function loadStore() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch (e) {
    return {};
  }
}

function saveStore(partial) {
  const cur = loadStore();
  for (const k in partial) cur[k] = partial[k];
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cur));
  } catch (e) {}
}

const pointer = {
  x: window.innerWidth / 2,
  y: window.innerHeight / 2,
  down: false,
  right: false,
};

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  canvas.style.width = window.innerWidth + 'px';
  canvas.style.height = window.innerHeight + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (minimap) {
    const s = window.innerWidth < 640 ? 110 : 160;
    minimap.width = s;
    minimap.height = s;
    minimap.style.width = s + 'px';
    minimap.style.height = s + 'px';
  }
}

function show(el) { if (el) el.classList.remove('hidden'); }
function hide(el) { if (el) el.classList.add('hidden'); }

function toast(msg) {
  var t = $('share-toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'share-toast';
    t.className = 'share-toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(function () { t.classList.remove('show'); }, 2200);
}

function updateCrosshair() {
  if (!crosshair) return;
  if (game && game.player && game.player.scoping) {
    crosshair.style.display = 'none';
    return;
  }
  crosshair.style.display = '';
  crosshair.style.left = pointer.x + 'px';
  crosshair.style.top = pointer.y + 'px';
}

function syncMouseToGame() {
  if (!game) return;
  const zoom = game.viewZoom || 1;
  const w = window.innerWidth;
  const h = window.innerHeight;
  game.mouse.x = pointer.x;
  game.mouse.y = pointer.y;
  game.mouse.down = pointer.down;
  game.mouse.right = pointer.right;
  game.mouse.worldX = game.camera.x + (pointer.x - w / 2) / zoom;
  game.mouse.worldY = game.camera.y + (pointer.y - h / 2) / zoom;
}

function refreshBestScoreUI() {
  const el = $('best-score');
  if (!el) return;
  const st = loadStore();
  const best = st.bestKills || 0;
  const wins = st.wins || 0;
  el.textContent = '历史最佳击杀 ' + best + ' · 吃鸡 ' + wins + ' 次';
}

function setDifficulty(level) {
  selectedDiff = level;
  applyDifficulty(level);
  saveStore({ difficulty: level });
  const buttons = document.querySelectorAll('.diff-btn');
  for (let i = 0; i < buttons.length; i++) {
    buttons[i].classList.toggle('active', buttons[i].getAttribute('data-diff') === level);
  }
  const label = (DIFFICULTY_PRESETS[level] || {}).label || level;
  const tip = $('menu-diff-tip');
  if (tip) tip.textContent = '当前难度：' + label + ' · ' + rosterLabel(WORLD.botCount);
}

function startGame() {
  try {
    if (typeof SFX !== 'undefined') SFX.unlock();
    applyDifficulty(selectedDiff);
    game = new Game();
    hide(menu);
    hide(resultScreen);
    hide(pauseScreen);
    show(hud);
    if (hud) hud.classList.add('playing');
    playing = true;
    pointer.x = window.innerWidth / 2;
    pointer.y = window.innerHeight / 2;
    pointer.down = false;
    pointer.right = false;
    updateCrosshair();
    syncMouseToGame();
    try { window.focus(); } catch (e) {}
    last = performance.now();
    cancelAnimationFrame(raf);
    loop(last);

    var hint = $('move-hint');
    if (hint) {
      hint.classList.remove('hidden', 'fade');
      setTimeout(function () { hint.classList.add('fade'); }, 5500);
      setTimeout(function () { hint.classList.add('hidden'); }, 6200);
    }
  } catch (err) {
    console.error(err);
    alert('启动失败: ' + (err && err.message ? err.message : err));
  }
}

function backToMenu() {
  playing = false;
  cancelAnimationFrame(raf);
  hide(hud);
  hide(pauseScreen);
  hide(resultScreen);
  show(menu);
  if (hud) hud.classList.remove('playing');
  pointer.down = false;
  pointer.right = false;
  game = null;
  refreshBestScoreUI();
}

function togglePause() {
  if (!game || game.ended || !playing) return;
  game.paused = !game.paused;
  if (game.paused) {
    pointer.down = false;
    pointer.right = false;
    show(pauseScreen);
  } else {
    hide(pauseScreen);
  }
}

function showResult() {
  if (!game) return;
  const s = game.getHudState();
  const win = s.result === 'win';
  const badge = $('result-badge');
  badge.textContent = win ? '胜利' : '被淘汰';
  badge.classList.toggle('lose', !win);
  $('result-title').innerHTML = win
    ? 'Winner Winner<br/>Chicken Dinner!'
    : '再接再厉 · 下次吃鸡';
  $('stat-rank').textContent = '#' + s.rank;
  $('stat-kills').textContent = String(s.kills);
  $('stat-time').textContent = s.time;
  show(resultScreen);

  const st = loadStore();
  const best = Math.max(st.bestKills || 0, s.kills || 0);
  const wins = (st.wins || 0) + (win ? 1 : 0);
  saveStore({ bestKills: best, wins: wins, lastRank: s.rank });
}

function updateHud() {
  if (!game) return;
  const s = game.getHudState();
  $('alive-count').textContent = '存活 ' + s.alive + '/' + (WORLD.botCount + 1);
  $('zone-info').textContent = s.zone;
  $('kill-count').textContent = '击杀 ' + s.kills;
  $('hp-text').textContent = s.hp + (s.maxHp ? '/' + s.maxHp : '');
  $('armor-text').textContent = String(s.armor);
  const hpPct = s.maxHp ? Math.max(0, Math.min(100, (s.hp / s.maxHp) * 100)) : s.hp;
  $('hp-bar').style.width = hpPct + '%';
  $('armor-bar').style.width = Math.max(0, Math.min(100, s.armor)) + '%';
  $('weapon-name').textContent = s.weaponName;
  $('ammo-text').textContent = s.ammo;
  $('medkit-text').textContent = '医疗包 ×' + s.medkits + ' (Q/E)';

  const slots = $('weapon-slots');
  slots.innerHTML = s.weapons.map(function (w) {
    return (
      '<div class="slot ' +
      (w.active ? 'active' : '') +
      (w.empty ? ' empty' : '') +
      '"><div class="key">' +
      w.key +
      '</div><div>' +
      w.name +
      '</div></div>'
    );
  }).join('');

  const hint = $('pickup-hint');
  if (s.nearLoot) {
    const auto = s.nearLoot.kind !== 'weapon';
    hint.textContent = auto
      ? '靠近自动拾取：' + s.nearLoot.label
      : '按 F 拾取：' + s.nearLoot.label;
    hint.classList.remove('hidden');
  } else {
    hint.classList.add('hidden');
  }

  const warn = $('zone-warn');
  if (s.inZoneDamage) warn.classList.remove('hidden');
  else warn.classList.add('hidden');

  $('kill-feed').innerHTML = game.killFeed
    .map(function (k) {
      return '<div class="kill-item">' + k.text + '</div>';
    })
    .join('');
}

function loop(ts) {
  raf = requestAnimationFrame(loop);
  if (!game || !playing) return;

  const dt = Math.min(0.05, (ts - last) / 1000);
  last = ts;

  syncMouseToGame();
  game.update(dt);

  game.draw(ctx, { width: window.innerWidth, height: window.innerHeight });
  const ms = minimap ? minimap.width : 160;
  game.drawMinimap(mctx, ms);
  updateHud();
  updateCrosshair();

  if (game.ended) {
    playing = false;
    pointer.down = false;
    pointer.right = false;
    setTimeout(showResult, 700);
  }
}

function bind(id, evt, fn) {
  const el = $(id);
  if (!el) return;
  el.addEventListener(evt, fn);
}

function copyShareLink() {
  const url = location.href.split('#')[0];
  const text = '来玩免费网页吃鸡：Battle Royale Lite\n' + url;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).then(function () {
      toast('链接已复制，发给朋友即可玩');
    }).catch(function () {
      prompt('复制此链接分享：', url);
    });
  } else {
    prompt('复制此链接分享：', url);
  }
  if (navigator.share) {
    navigator.share({ title: '大逃杀轻量版', text: '网页吃鸡，点开即玩', url: url }).catch(function () {});
  }
  return text;
}

function toggleFullscreen() {
  const doc = document;
  if (!doc.fullscreenElement && !doc.webkitFullscreenElement) {
    const el = doc.documentElement;
    const req = el.requestFullscreen || el.webkitRequestFullscreen;
    if (req) req.call(el);
  } else {
    const exit = doc.exitFullscreen || doc.webkitExitFullscreen;
    if (exit) exit.call(doc);
  }
}

bind('btn-start', 'click', startGame);
bind('btn-again', 'click', startGame);
bind('btn-menu', 'click', backToMenu);
bind('btn-resume', 'click', function () {
  if (game) {
    game.paused = false;
    hide(pauseScreen);
  }
});
bind('btn-quit', 'click', backToMenu);
bind('btn-share', 'click', copyShareLink);
bind('btn-fullscreen', 'click', toggleFullscreen);

var muteBtn = $('btn-mute');
if (muteBtn) {
  muteBtn.addEventListener('click', function () {
    if (typeof SFX === 'undefined') return;
    const m = SFX.toggleMute();
    muteBtn.textContent = m ? '音效：关' : '音效：开';
    saveStore({ muted: m });
  });
}

var diffBtns = document.querySelectorAll('.diff-btn');
for (let i = 0; i < diffBtns.length; i++) {
  diffBtns[i].addEventListener('click', function () {
    setDifficulty(this.getAttribute('data-diff'));
  });
}

window.addEventListener('resize', resize);

window.addEventListener('mousemove', function (e) {
  pointer.x = e.clientX;
  pointer.y = e.clientY;
  updateCrosshair();
  if (game) syncMouseToGame();
});

window.addEventListener('mousedown', function (e) {
  if (typeof SFX !== 'undefined') SFX.unlock();
  if (!game || game.paused || game.ended || !playing) return;
  if (!menu.classList.contains('hidden')) return;
  if (!resultScreen.classList.contains('hidden')) return;
  if (!pauseScreen.classList.contains('hidden')) return;
  pointer.x = e.clientX;
  pointer.y = e.clientY;
  if (e.button === 0) pointer.down = true;
  if (e.button === 2) {
    e.preventDefault();
    pointer.right = true;
    if (game) game.mouse.right = true;
  }
  syncMouseToGame();
});

window.addEventListener('mouseup', function (e) {
  if (e.button === 0) {
    pointer.down = false;
    if (game) game.mouse.down = false;
  }
  if (e.button === 2) {
    pointer.right = false;
    if (game) game.mouse.right = false;
  }
});

window.addEventListener('blur', function () {
  pointer.down = false;
  pointer.right = false;
  if (game) {
    game.mouse.down = false;
    game.mouse.right = false;
  }
});

window.addEventListener('touchstart', function (e) {
  if (!playing || !game) return;
  if (e.touches.length === 1) {
    const t = e.touches[0];
    pointer.x = t.clientX;
    pointer.y = t.clientY;
    pointer.down = true;
    syncMouseToGame();
  }
}, { passive: true });

window.addEventListener('touchmove', function (e) {
  if (!playing || !game) return;
  if (e.touches.length === 1) {
    const t = e.touches[0];
    pointer.x = t.clientX;
    pointer.y = t.clientY;
    syncMouseToGame();
    updateCrosshair();
  }
}, { passive: true });

window.addEventListener('touchend', function () {
  pointer.down = false;
  if (game) game.mouse.down = false;
});

window.addEventListener('keydown', function (e) {
  if (e.code === 'KeyM' && typeof SFX !== 'undefined') {
    const m = SFX.toggleMute();
    if (muteBtn) muteBtn.textContent = m ? '音效：关' : '音效：开';
    saveStore({ muted: m });
  }
  if (e.code === 'KeyF11') {
    e.preventDefault();
    toggleFullscreen();
  }
  if (e.code === 'Escape') {
    if (!resultScreen.classList.contains('hidden')) return;
    if (!menu.classList.contains('hidden')) return;
    togglePause();
    return;
  }
  if (!game || game.paused) return;
  game.onKeyDown(e.code);
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].indexOf(e.code) >= 0) {
    e.preventDefault();
  }
});

window.addEventListener('keyup', function (e) {
  if (!game) return;
  game.onKeyUp(e.code);
});

window.addEventListener('contextmenu', function (e) {
  if (playing) e.preventDefault();
});

window.addEventListener('dragstart', function (e) {
  if (playing) e.preventDefault();
});

resize();
updateCrosshair();

const stored = loadStore();
if (stored.muted && typeof SFX !== 'undefined') {
  if (!SFX.isMuted()) SFX.toggleMute();
  if (muteBtn) muteBtn.textContent = '音效：关';
}
setDifficulty(stored.difficulty || 'normal');
refreshBestScoreUI();
