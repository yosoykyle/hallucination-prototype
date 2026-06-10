// ─────────────────────────────────────────────────────────────────────────────
// particles.js  —  Theme particle effects (Fireworks, Sakura, Stars, Aurora)
// ─────────────────────────────────────────────────────────────────────────────

const ParticleEngine = {
  _active: null,
  _container: null,

  start(id) {
    this.stop();
    if (!this._container) {
      this._container = document.createElement('div');
      this._container.id = 'particle-overlay';
      document.body.appendChild(this._container);
    }
    switch (id) {
      case 'fireworks': this._active = new FireworkEngine(this._container); break;
      case 'sakura':    this._active = new SakuraEngine(this._container); break;
      case 'stargazer': this._active = new StarEngine(this._container); break;
      case 'aurora':    this._active = new AuroraEngine(this._container); break;
    }
  },

  stop() {
    if (this._active) { this._active.destroy(); this._active = null; }
    if (this._container) { this._container.innerHTML = ''; }
  },
};

// ── Fireworks ─────────────────────────────────────────────────────────────────

class FireworkEngine {
  constructor(container) {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'theme-canvas';
    container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');
    this.particles = [];
    this.bursts = [];
    this.running = true;
    this._resize();
    this._onResize = () => this._resize();
    window.addEventListener('resize', this._onResize);
    this._scheduleBurst();
    this._loop();
  }

  _resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  _rand(min, max) { return min + Math.random() * (max - min); }

  _scheduleBurst() {
    if (!this.running) return;
    const delay = this._rand(1800, 5000);
    this._timer = setTimeout(() => {
      if (!this.running) return;
      this._createBurst();
      this._scheduleBurst();
    }, delay);
  }

  _createBurst() {
    const x = this._rand(this.canvas.width * 0.15, this.canvas.width * 0.85);
    const y = this._rand(this.canvas.height * 0.08, this.canvas.height * 0.45);
    const colors = ['#FF6B6B','#FFE66D','#4ECDC4','#A855F7','#F97316','#22D3EE','#F472B6','#34D399'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const count = Math.floor(this._rand(20, 40));
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + this._rand(-0.15, 0.15);
      const speed = this._rand(1.5, 4.5);
      this.particles.push({
        x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        life: 1, maxLife: this._rand(0.8, 1.6), color, size: this._rand(1.5, 3.5),
        gravity: this._rand(0.02, 0.06), decay: this._rand(0.008, 0.025),
      });
    }
  }

  _loop() {
    if (!this.running) return;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.vx *= 0.99;
      p.life -= p.decay;
      if (p.life <= 0 || p.y > this.canvas.height) { this.particles.splice(i, 1); continue; }
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    this._raf = requestAnimationFrame(() => this._loop());
  }

  destroy() {
    this.running = false;
    cancelAnimationFrame(this._raf);
    clearTimeout(this._timer);
    window.removeEventListener('resize', this._onResize);
    this.canvas.remove();
  }
}

// ── Sakura (CSS petal engine) ─────────────────────────────────────────────────

class SakuraEngine {
  constructor(container) {
    this.container = container;
    this.petals = [];
    this.running = true;
    this._spawn();
    this._interval = setInterval(() => this._spawn(), 600);
  }

  _spawn() {
    if (!this.running) return;
    const el = document.createElement('div');
    el.className = 'sakura-petal';
    const size = 8 + Math.random() * 10;
    const colors = ['#FFB7C5','#FF9CB5','#FFC0CB','#F8BBD0','#E8A0B4','#FFD1DC'];
    el.style.cssText = `
      left:${Math.random() * 100}%; width:${size}px; height:${size}px;
      background:${colors[Math.floor(Math.random() * colors.length)]};
      animation:sakuraFall ${4 + Math.random() * 6}s linear forwards;
      animation-delay:${Math.random() * 2}s;
    `;
    this.container.appendChild(el);
    this.petals.push(el);
    setTimeout(() => { el.remove(); this.petals = this.petals.filter(e => e !== el); }, 12000);
  }

  destroy() {
    this.running = false;
    clearInterval(this._interval);
    this.petals.forEach(el => el.remove());
    this.petals = [];
  }
}

// ── Stars (CSS star field) ────────────────────────────────────────────────────

class StarEngine {
  constructor(container) {
    this.container = container;
    this.stars = [];
    this.running = true;
    this._render();
  }

  _render() {
    if (!this.running) return;
    const count = 120 + Math.floor(Math.random() * 40);
    for (let i = 0; i < count; i++) {
      const el = document.createElement('div');
      el.className = 'star-dot';
      const size = 1 + Math.random() * 2.5;
      const duration = 1.5 + Math.random() * 3;
      const delay = Math.random() * 4;
      const x = Math.random() * 100;
      const y = Math.random() * 100;
      const colors = ['#FFF','#FFEEDD','#CCE8FF','#FFDDE8','#E8DDFF'];
      el.style.cssText = `
        left:${x}%; top:${y}%; width:${size}px; height:${size}px;
        background:${colors[Math.floor(Math.random() * colors.length)]};
        animation:starTwinkle ${duration}s ease-in-out ${delay}s infinite;
      `;
      this.container.appendChild(el);
      this.stars.push(el);
    }
  }

  destroy() {
    this.running = false;
    this.stars.forEach(el => el.remove());
    this.stars = [];
  }
}

// ── Aurora (CSS wave engine) ──────────────────────────────────────────────────

class AuroraEngine {
  constructor(container) {
    this.container = container;
    this.waves = [];
    for (let i = 0; i < 3; i++) {
      const el = document.createElement('div');
      el.className = 'aurora-wave';
      this.container.appendChild(el);
      this.waves.push(el);
    }
  }

  destroy() {
    this.waves.forEach(el => el.remove());
    this.waves = [];
  }
}
