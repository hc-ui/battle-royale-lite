/** 轻量音效（Web Audio，无外部资源） */

const SFX = (function () {
  let ctx = null;
  let muted = false;
  let master = 0.22;

  function ac() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, dur, type, vol, slide) {
    if (muted) return;
    const a = ac();
    if (!a) return;
    const t0 = a.currentTime;
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, slide), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime((vol || 0.2) * master, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g);
    g.connect(a.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  }

  function noiseBurst(dur, vol) {
    if (muted) return;
    const a = ac();
    if (!a) return;
    const n = Math.floor(a.sampleRate * dur);
    const buf = a.createBuffer(1, n, a.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = a.createBufferSource();
    src.buffer = buf;
    const g = a.createGain();
    g.gain.value = (vol || 0.15) * master;
    src.connect(g);
    g.connect(a.destination);
    src.start();
  }

  return {
    unlock: function () { ac(); },
    toggleMute: function () {
      muted = !muted;
      return muted;
    },
    isMuted: function () { return muted; },
    shoot: function (heavy) {
      noiseBurst(heavy ? 0.08 : 0.04, heavy ? 0.18 : 0.1);
      tone(heavy ? 120 : 220, 0.06, 'sawtooth', 0.08, 60);
    },
    sniper: function () {
      noiseBurst(0.12, 0.22);
      tone(90, 0.14, 'sawtooth', 0.14, 40);
      setTimeout(function () { tone(60, 0.1, 'triangle', 0.08, 35); }, 40);
    },
    scopeIn: function () { tone(280, 0.06, 'sine', 0.06, 420); },
    scopeOut: function () { tone(360, 0.05, 'sine', 0.05, 180); },
    hit: function () { tone(180, 0.07, 'triangle', 0.12, 80); },
    kill: function () {
      tone(320, 0.1, 'square', 0.1, 90);
      setTimeout(function () { tone(180, 0.15, 'triangle', 0.1, 60); }, 60);
    },
    pickup: function () { tone(520, 0.08, 'sine', 0.1, 780); },
    reload: function () { tone(200, 0.05, 'triangle', 0.06); tone(140, 0.08, 'triangle', 0.05); },
    medkit: function () {
      tone(400, 0.1, 'sine', 0.1);
      setTimeout(function () { tone(560, 0.12, 'sine', 0.1); }, 80);
    },
    hurt: function () { tone(90, 0.12, 'sawtooth', 0.12, 50); },
    win: function () {
      [523, 659, 784, 1046].forEach(function (f, i) {
        setTimeout(function () { tone(f, 0.18, 'sine', 0.12); }, i * 120);
      });
    },
    lose: function () {
      tone(220, 0.2, 'triangle', 0.1, 110);
      setTimeout(function () { tone(140, 0.35, 'sine', 0.1, 70); }, 150);
    },
  };
})();
