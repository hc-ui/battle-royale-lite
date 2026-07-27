/** 缩圈系统 — 更慢、更温和 */

class Zone {
  constructor() {
    this.cx = WORLD.size / 2;
    this.cy = WORLD.size / 2;
    this.radius = WORLD.size * 0.78;
    this.targetCx = this.cx;
    this.targetCy = this.cy;
    this.targetRadius = this.radius;
    this.phase = 0;
    this.timer = 40; // 首圈更久
    this.state = 'wait';
    this.damage = 1;
    this.phases = [
      { wait: 40, shrink: 35, radius: WORLD.size * 0.55, dmg: 1.5 },
      { wait: 28, shrink: 32, radius: WORLD.size * 0.34, dmg: 2.5 },
      { wait: 22, shrink: 28, radius: WORLD.size * 0.18, dmg: 4 },
      { wait: 16, shrink: 24, radius: WORLD.size * 0.09, dmg: 7 },
    ];
    this._pickNextTarget();
  }

  _pickNextTarget() {
    if (this.phase >= this.phases.length) {
      this.targetRadius = Math.max(50, this.radius * 0.55);
      this.targetCx = this.cx + (Math.random() - 0.5) * this.radius * 0.25;
      this.targetCy = this.cy + (Math.random() - 0.5) * this.radius * 0.25;
      return;
    }
    const p = this.phases[this.phase];
    this.targetRadius = p.radius;
    const maxShift = Math.max(0, this.radius - this.targetRadius) * 0.45;
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
        this.timer = p ? p.shrink : 24;
        this.shrinkDuration = this.timer;
        this.startRadius = this.radius;
        this.startCx = this.cx;
        this.startCy = this.cy;
      }
    } else {
      const p = this.phases[Math.min(this.phase, this.phases.length - 1)];
      const dur = this.shrinkDuration || 24;
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
        this.timer = this.phases[this.phase] ? this.phases[this.phase].wait : 14;
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
