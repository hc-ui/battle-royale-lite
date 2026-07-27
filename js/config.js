/** 游戏常量与武器 — 休闲优化版 */

const WORLD = {
  size: 2000,
  botCount: 8,
};

/** 难度：easy | normal | hard */
let GAME_DIFFICULTY = 'easy';

const DIFFICULTY_PRESETS = {
  easy: {
    botCount: 8,
    botDamageMul: 0.45,
    botAccuracyMin: 0.18,
    botAccuracyMax: 0.42,
    botShootChance: 0.38,
    playerHp: 130,
    playerStartArmor: 50,
    playerStartMedkits: 3,
    playerStartAmmo: 100,
    label: '休闲',
  },
  normal: {
    botCount: 12,
    botDamageMul: 0.7,
    botAccuracyMin: 0.35,
    botAccuracyMax: 0.6,
    botShootChance: 0.55,
    playerHp: 100,
    playerStartArmor: 25,
    playerStartMedkits: 1,
    playerStartAmmo: 60,
    label: '标准',
  },
  hard: {
    botCount: 16,
    botDamageMul: 1.0,
    botAccuracyMin: 0.5,
    botAccuracyMax: 0.78,
    botShootChance: 0.72,
    playerHp: 100,
    playerStartArmor: 0,
    playerStartMedkits: 0,
    playerStartAmmo: 30,
    label: '困难',
  },
};

function applyDifficulty(level) {
  const p = DIFFICULTY_PRESETS[level] || DIFFICULTY_PRESETS.easy;
  GAME_DIFFICULTY = level;
  WORLD.botCount = p.botCount;
  BALANCE.botDamageMul = p.botDamageMul;
  BALANCE.botAccuracyMin = p.botAccuracyMin;
  BALANCE.botAccuracyMax = p.botAccuracyMax;
  BALANCE.botShootChance = p.botShootChance;
  BALANCE.playerHp = p.playerHp;
  BALANCE.playerStartArmor = p.playerStartArmor;
  BALANCE.playerStartMedkits = p.playerStartMedkits;
  BALANCE.playerStartAmmo = p.playerStartAmmo;
  return p;
}

const WEAPONS = {
  fists: {
    id: 'fists', name: '拳头', damage: 16, range: 46, fireRate: 280,
    spread: 0.08, magSize: Infinity, reload: 0, bulletSpeed: 0,
    color: '#ccc', isMelee: true,
  },
  pistol: {
    id: 'pistol', name: '手枪', damage: 28, range: 360, fireRate: 240,
    spread: 0.035, magSize: 12, reload: 1000, bulletSpeed: 900,
    color: '#f4d35e', isMelee: false,
  },
  smg: {
    id: 'smg', name: '冲锋枪', damage: 17, range: 420, fireRate: 80,
    spread: 0.08, magSize: 30, reload: 1400, bulletSpeed: 950,
    color: '#4cc9f0', isMelee: false,
  },
  rifle: {
    id: 'rifle', name: '步枪', damage: 34, range: 580, fireRate: 145,
    spread: 0.028, magSize: 30, reload: 1700, bulletSpeed: 1100,
    color: '#3ddc97', isMelee: false,
  },
  shotgun: {
    id: 'shotgun', name: '霰弹枪', damage: 15, range: 210, fireRate: 620,
    spread: 0.18, magSize: 6, reload: 1900, bulletSpeed: 800,
    pellets: 6, color: '#ff8fab', isMelee: false,
  },
  sniper: {
    id: 'sniper', name: '狙击枪', damage: 78, range: 920, fireRate: 1100,
    spread: 0.14, // 腰射很散
    scopeSpread: 0.006, // 开镜极准
    magSize: 5, reload: 2600, bulletSpeed: 1400,
    color: '#c084fc', isMelee: false,
    canScope: true,
    scopeZoom: 2.35,
    scopeMoveMul: 0.55,
  },
};

const LOOT_TYPES = [
  { kind: 'weapon', weaponId: 'pistol', label: '手枪', color: '#f4d35e', weight: 2.4 },
  { kind: 'weapon', weaponId: 'smg', label: '冲锋枪', color: '#4cc9f0', weight: 2.0 },
  { kind: 'weapon', weaponId: 'rifle', label: '步枪', color: '#3ddc97', weight: 1.5 },
  { kind: 'weapon', weaponId: 'shotgun', label: '霰弹枪', color: '#ff8fab', weight: 1.7 },
  { kind: 'weapon', weaponId: 'sniper', label: '狙击枪', color: '#c084fc', weight: 0.9 },
  { kind: 'ammo', amount: 45, label: '弹药', color: '#ffc857', weight: 4.8 },
  { kind: 'medkit', amount: 1, label: '医疗包', color: '#3ddc97', weight: 3.8 },
  { kind: 'armor', amount: 50, label: '护甲', color: '#3a86ff', weight: 3.2 },
];

const BOT_NAMES = [
  'Shadow', 'Viper', 'Nova', 'Rex', 'Kite',
  'Blaze', 'Frost', 'Echo', 'Raven', 'Drift',
  'Pulse', 'Ghost', 'Hawk', 'Bolt', 'Ash',
];

const BALANCE = {
  botDamageMul: 0.48,
  botAccuracyMin: 0.2,
  botAccuracyMax: 0.45,
  botEngageBonus: 30,
  botShootChance: 0.4,
  playerStartArmor: 45,
  playerStartMedkits: 2,
  playerStartAmmo: 90,
  playerHp: 125,
  autoPickupR: 30,
  aimAssist: 0.12, // 轻微辅助瞄准
  lookAhead: 0.18, // 镜头朝瞄准方向微移
  scopeAimAssist: 0.22, // 开镜时稍强吸附
};

function pickLootType() {
  const total = LOOT_TYPES.reduce(function (s, t) { return s + t.weight; }, 0);
  let r = Math.random() * total;
  for (let i = 0; i < LOOT_TYPES.length; i++) {
    r -= LOOT_TYPES[i].weight;
    if (r <= 0) return LOOT_TYPES[i];
  }
  return LOOT_TYPES[0];
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function dist(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

function angleTo(from, to) {
  return Math.atan2(to.y - from.y, to.x - from.x);
}

function lerpAngle(a, b, t) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

function randRange(min, max) {
  return min + Math.random() * (max - min);
}

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return m + ':' + String(s).padStart(2, '0');
}

function cloneWeapon(w) {
  const c = {};
  for (const k in w) c[k] = w[k];
  return c;
}

function hash2(x, y) {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}
