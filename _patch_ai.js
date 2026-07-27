const fs = require('fs');
const path = 'D:/grok_test/pubg-lite/js/entities.js';
let s = fs.readFileSync(path, 'utf8');
const start = s.indexOf('function updateBot(bot, dt, now, game)');
const end = s.indexOf('function pickupLoot(entity, item, silent)');
if (start < 0 || end < 0) { console.error('markers not found', start, end); process.exit(1); }
const newCode = `function updateBot(bot, dt, now, game) {
  if (!bot.alive) return;
  bot.stateTimer -= dt;
  if (bot.invuln > 0) bot.invuln -= dt;
  if (bot.lastHurt > 0) bot.lastHurt -= dt;

  if (bot.reloading && now >= bot.reloadEnd) finishReload(bot);

  if (game.zone.isOutside(bot)) {
    bot.state = 'zone';
    bot.target = null;
  }

  if (bot.hp < 45 && bot.medkits > 0 && Math.random() < 0.04) useMedkit(bot);

  const enemies = game.aliveEntities().filter(function (e) {
    return e !== bot && e.alive;
  });
  let nearestEnemy = null;
  let nearestDist = Infinity;
  let playerEnemy = null;
  let playerDist = Infinity;
  for (let i = 0; i < enemies.length; i++) {
    const e = enemies[i];
    const d = dist(bot, e);
    if (d < nearestDist) {
      nearestDist = d;
      nearestEnemy = e;
    }
    if (e.isPlayer) {
      playerEnemy = e;
      playerDist = d;
    }
  }

  const huntMul = bot.aggression || 0.7;
  if (
    playerEnemy &&
    playerDist < 520 * huntMul + (BALANCE.botEngageBonus || 80) &&
    bot.state !== 'zone' &&
    Math.random() < (BALANCE.botHuntChance || 0.5) * 0.08
  ) {
    bot.state = 'hunt';
    bot.target = playerEnemy;
  }

  const w = getActiveWeapon(bot);
  const engageRange = (w.isMelee ? 70 : w.range * 0.72) + (BALANCE.botEngageBonus || 80);

  if (bot.state !== 'zone' && nearestEnemy && nearestDist < engageRange + 80) {
    const see = canSee(bot, nearestEnemy, game.buildings);
    if ((see || nearestDist < 140) && Math.random() < bot.reaction) {
      bot.state = 'fight';
      bot.target = nearestEnemy;
    }
  }

  if (bot.lastHurt > 0.2 && nearestEnemy && nearestDist < engageRange + 120) {
    bot.state = 'fight';
    bot.target = nearestEnemy;
  }

  if (bot.state === 'zone') {
    const ang = angleTo(bot, { x: game.zone.cx, y: game.zone.cy });
    moveEntity(bot, Math.cos(ang), Math.sin(ang), dt, game.buildings, true);
    bot.angle = ang;
    if (nearestEnemy && nearestDist < engageRange * 0.9 && canSee(bot, nearestEnemy, game.buildings)) {
      bot.angle = angleTo(bot, nearestEnemy) + bot.aimJitter * 0.5;
      maybeBotShoot(bot, now, game);
    }
    if (!game.zone.isOutside(bot)) {
      bot.state = Math.random() < 0.5 ? 'hunt' : 'loot';
      bot.stateTimer = 1.2;
    }
    return;
  }

  if (bot.state === 'hunt') {
    const prey = (bot.target && bot.target.alive) ? bot.target : (playerEnemy || nearestEnemy);
    if (!prey) {
      bot.state = 'loot';
      bot.stateTimer = 1;
    } else {
      bot.target = prey;
      const d = dist(bot, prey);
      bot.angle = angleTo(bot, prey) + bot.aimJitter * (0.8 - bot.accuracy * 0.5);
      if (d > 60) {
        moveEntity(bot, Math.cos(bot.angle), Math.sin(bot.angle), dt, game.buildings, d > 180);
      }
      if (d < engageRange + 40 && (canSee(bot, prey, game.buildings) || d < 100)) {
        bot.state = 'fight';
      }
      if (bot.stateTimer <= 0 && d > 600) {
        bot.state = 'loot';
        bot.stateTimer = 2;
      }
    }
  }

  if (bot.state === 'fight' && bot.target && bot.target.alive) {
    const d = dist(bot, bot.target);
    const jitterScale = d < 160 ? 0.35 : 0.9;
    bot.angle = angleTo(bot, bot.target) + bot.aimJitter * (1.05 - bot.accuracy) * jitterScale;

    if (bot.hp < 18 && d < 160 && Math.random() < 0.4) {
      const flee = angleTo(bot.target, bot);
      moveEntity(bot, Math.cos(flee), Math.sin(flee), dt, game.buildings, true);
      bot.angle = flee;
    } else if (d > engageRange * 0.55) {
      moveEntity(bot, Math.cos(bot.angle), Math.sin(bot.angle), dt, game.buildings, d > 200);
    } else if (d < 70 && !w.isMelee && w.id !== 'shotgun') {
      moveEntity(bot, -Math.cos(bot.angle), -Math.sin(bot.angle), dt, game.buildings, false);
    } else {
      const side = Math.cos(bot.angle + Math.PI / 2) * (Math.sin(now / 280) > 0 ? 1 : -1);
      const sidY = Math.sin(bot.angle + Math.PI / 2) * (Math.sin(now / 280) > 0 ? 1 : -1);
      moveEntity(bot, side * 0.7 + Math.cos(bot.angle) * 0.3, sidY * 0.7 + Math.sin(bot.angle) * 0.3, dt, game.buildings, false);
    }

    if (d < engageRange + 30 && (canSee(bot, bot.target, game.buildings) || d < 90)) {
      maybeBotShoot(bot, now, game);
    }

    if (d > engageRange + 280 || !bot.target.alive) {
      bot.state = Math.random() < (BALANCE.botHuntChance || 0.5) ? 'hunt' : 'loot';
      bot.target = bot.target && bot.target.alive ? bot.target : null;
      bot.stateTimer = 1.2;
    }
    return;
  }

  if (bot.stateTimer <= 0) {
    const late = game.zone && game.zone.phase >= 1;
    if (late && nearestEnemy && nearestDist < 480 && Math.random() < 0.55) {
      bot.state = 'hunt';
      bot.target = nearestEnemy;
      bot.stateTimer = 3;
    } else {
      let best = null;
      let bestD = 300;
      for (let i = 0; i < game.loot.length; i++) {
        const item = game.loot[i];
        if (item.taken) continue;
        const prefer = item.kind === 'weapon' ? 0.65 : 1;
        const d = dist(bot, item) * prefer;
        if (d < bestD) {
          bestD = d;
          best = item;
        }
      }
      const armed = getActiveWeapon(bot) && !getActiveWeapon(bot).isMelee;
      if (best && (!armed || Math.random() < 0.55)) {
        bot.target = best;
        bot.state = 'loot';
        bot.stateTimer = 4;
      } else if (playerEnemy && Math.random() < (BALANCE.botHuntChance || 0.5)) {
        bot.state = 'hunt';
        bot.target = playerEnemy;
        bot.stateTimer = 4;
      } else {
        bot.wanderAngle += randRange(-0.7, 0.7);
        bot.state = 'wander';
        bot.stateTimer = randRange(1.2, 2.8);
        bot.target = null;
      }
    }
  }

  if (bot.state === 'loot' && bot.target && bot.target.taken === false) {
    const ang = angleTo(bot, bot.target);
    const dLoot = dist(bot, bot.target);
    bot.angle = ang;
    moveEntity(bot, Math.cos(ang), Math.sin(ang), dt, game.buildings, dLoot > 90);
    if (dLoot < 28) {
      pickupLoot(bot, bot.target, true);
      bot.target = null;
      bot.stateTimer = 0.15;
      if (Math.random() < 0.6) {
        bot.state = 'hunt';
        bot.stateTimer = 2;
      }
    }
  } else if (bot.state === 'wander' || (bot.state !== 'hunt' && bot.state !== 'fight' && bot.state !== 'loot')) {
    moveEntity(bot, Math.cos(bot.wanderAngle), Math.sin(bot.wanderAngle), dt, game.buildings, Math.random() < 0.3);
    bot.angle = bot.wanderAngle;
    if (bot.x < 40 || bot.x > WORLD.size - 40 || bot.y < 40 || bot.y > WORLD.size - 40) {
      bot.wanderAngle += Math.PI + randRange(-0.5, 0.5);
    }
  } else if (bot.state === 'loot' && (!bot.target || bot.target.taken)) {
    bot.stateTimer = 0;
  }
}

function maybeBotShoot(bot, now, game) {
  const w = getActiveWeapon(bot);
  ensureMag(bot, w);
  if (!w.isMelee && bot.mag[w.id] <= 0) {
    tryReload(bot, now);
    return;
  }
  if (Math.random() > Math.min(0.98, bot.accuracy * BALANCE.botShootChance * 1.15)) return;
  let ang = bot.angle;
  if (bot.target && bot.target.alive) {
    ang = angleTo(bot, bot.target) + bot.aimJitter * (1 - bot.accuracy) * 0.6;
  }
  const result = fireWeapon(
    bot,
    now,
    ang,
    game.buildings,
    game.aliveEntities(),
    game.bullets,
    game.sparks
  );
  if (result && result.killed) game.addKillFeed(bot.name, result.hit.name);
}

`;
s = s.slice(0, start) + newCode + s.slice(end);
fs.writeFileSync(path, s);
console.log('updated updateBot, len', s.length);