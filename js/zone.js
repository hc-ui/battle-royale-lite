/** 缩圈系统 — 更紧、更疼（受 BALANCE.zoneScale 影响） */

class Zone {
  constructor() {
    const s = BALANCE.zoneScale != null ? BALANCE.zoneScale : 0.85;
    this.cx = WORLD.size / 2;
    this.cy = WORLD.size / 2;
    this.radius = WORLD.size * 0.72;
    this.targetCx = this.cx;
    this.targetCy = this.cy;
    this.targetRadius = this.radius;
    this.phase = 0;
    this.timer = Math.max(12, 28 * s);
    this.state = 'wait';
    this.damage = 2.5;
    // wait/shrink 会乘 zoneScale（越小节奏越快）
    this.phases = [
      { wait: 28 * s, shrink: 26 * s, radius: WORLD.size * 0.48, dmg: 4 },
      { wait: 18 * s, shrink: 22 * s, radius: WORLD.size * 0.28, dmg: 7 },
      { wait: 12 * s, shrink: 18 * s, radius: WORLD.size * 0.14, dmg: 12 },
      { wait: 8 * s, shrink: 14 * s, radius: WORLD.size * 0.06, dmg: 18 },
    ];
    this._pickNextTarget();
  }

  _pickNextTarget() {
    if (this.phase >= this.phases.length) {
      this.targetRadius = Math.max(40, this.radius * 0.5);
      this.targetCx = this.cx + (Math.random() - 0.5) * this.radius * 0.28;
      this.targetCy = this.cy + (Math.random() - 0.5) * this.radius * 0.28;
      return;
    }
    const p = this.phases[this.phase];
    this.targetRadius = p.radius;
    const maxShift = Math.max(0, this.radius - this.targetRadius) * 0.55;
    this.targetCx = this.cx + (Math.random() - 0.5) * maxShift * 2;
    this.targetCy = this.cy + (Math.random() - 0.5) * maxShift * 2;
    this.targetCx = Math.max(this.targetRadius, Math.min(WORLD.size - this.targetRadius, this.targetCx));
    this.targetCy = Math.max(this.targetRadius, Math.min(WORLD.size - this.targetRadius, this.targetCy));
  }

  update(dt) {
    this.timer -= dt;
    if (this.state === 'wait') {
      if (this.timer <= 0) {
        this.state = 'shrink';
        const p = this.phases[Math.min(this.phase, this.phases.length - 1)];
        this.timer = p ? p.shrink : 16;
        this.shrinkDuration = this.timer;
        this.startRadius = this.radius;
        this.startCx = this.cx;
        this.startCy = this.cy;
      }
    } else {
      const p = this.phases[Math.min(this.phase, this.phases.length - 1)];
      const dur = this.shrinkDuration || 16;
      const t = 1 - Math.max(0, this.timer) / dur;
      const ease = t * t * (3 - 2 * t);
      this.radius = this.startRadius + (this.targetRadius - this.startRadius) * ease;
      this.cx = this.startCx + (this.targetCx - this.startCx) * ease;
      this.cy = this.startCy + (this.targetCy - this.startCy) * ease;
      if (this.timer <= 0) {
        this.radius = this.targetRadius;
        this.cx = this.targetCx;
        this.cy = this.targetCy;
        if (p) this.damage = p.dmg;
        this.phase += 1;
        this.state = 'wait';
        this.timer = this.phases[this.phase] ? this.phases[this.phase].wait : 10;
        this._pickNextTarget();
      }
    }
  }

  isOutside(entity) {
    return dist(entity, { x: this.cx, y: this.cy }) > this.radius;
  }

  getStatusText() {
    if (this.state === 'wait') {
      return '安全区稳定 ' + Math.ceil(this.timer) + 's';
    }
    return '缩圈中 ' + Math.ceil(this.timer) + 's';
  }
}
