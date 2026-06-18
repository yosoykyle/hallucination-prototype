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
      case 'synthwave': this._active = new SynthwaveEngine(this._container); break;
      case 'anime':     this._active = new AnimeEngine(this._container); break;
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
    const delay = this._rand(20, 1000);
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
    const count = Math.floor(this._rand(60, 500));
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
      const colors = ['#FFF','#FFEEDD','#CCE8FF','#FFDDE8','#E8DDFF', '#ff0000ff','#00ff2fff','#0048ffff','#6600ffff'];
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

// ── Synthwave (Canvas 3D grid, retro sun, vector mountains & floaters) ────────

class SynthwaveEngine {
  constructor(container) {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'theme-canvas';
    container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');
    this.running = true;
    this.offset = 0;
    this.stars = [];
    this.shapes = [];
    this._resize();
    this._onResize = () => this._resize();
    window.addEventListener('resize', this._onResize);
    this._loop();
  }

  _resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this._initElements();
  }

  _initElements() {
    this.stars = [];
    const starCount = Math.floor((this.canvas.width * this.canvas.height) / 8000);
    for (let i = 0; i < starCount; i++) {
      this.stars.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height * 0.65,
        size: Math.random() * 2 + 0.5,
        alpha: Math.random(),
        twinkleSpeed: 0.008 + Math.random() * 0.015
      });
    }

    this.shapes = [];
    for (let i = 0; i < 8; i++) {
      this._spawnShape(true);
    }
  }

  _spawnShape(randomY = false) {
    const colors = ['#FF6B9D', '#00D4FF', '#FFB800', '#A855F7'];
    this.shapes.push({
      x: Math.random() * this.canvas.width,
      y: randomY ? Math.random() * this.canvas.height : this.canvas.height + 20,
      size: 10 + Math.random() * 25,
      type: Math.random() > 0.5 ? 'triangle' : 'cross',
      color: colors[Math.floor(Math.random() * colors.length)],
      speed: 0.3 + Math.random() * 0.8,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: -0.02 + Math.random() * 0.04
    });
  }

  _loop() {
    if (!this.running) return;
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.clearRect(0, 0, w, h);

    // 1. Twinkling Stars
    for (let s of this.stars) {
      s.alpha += s.twinkleSpeed;
      if (s.alpha > 1 || s.alpha < 0) s.twinkleSpeed = -s.twinkleSpeed;
      ctx.fillStyle = `rgba(240, 216, 255, ${Math.max(0.1, Math.min(1, s.alpha))})`;
      ctx.fillRect(s.x, s.y, s.size, s.size);
    }

    const horizon = h * 0.62;
    const sunR = Math.min(w * 0.18, 120);
    const sunX = w * 0.5;
    const sunY = horizon - 15;

    // 2. Retro Sunset (sliced neon sun)
    if (sunR > 20) {
      ctx.save();
      const grad = ctx.createLinearGradient(sunX, sunY - sunR, sunX, sunY + sunR);
      grad.addColorStop(0, '#FF3366');
      grad.addColorStop(0.5, '#FF6B9D');
      grad.addColorStop(1, '#FFB800');

      ctx.beginPath();
      ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
      ctx.clip();

      ctx.fillStyle = grad;
      ctx.fillRect(sunX - sunR, sunY - sunR, sunR * 2, sunR * 2);

      // Slices representing negative space (same color as synthwave background: #12052B)
      ctx.fillStyle = '#12052B';
      const numCuts = 10;
      for (let i = 0; i < numCuts; i++) {
        const startY = sunY - sunR * 0.3 + (sunR * 1.3 * i) / numCuts;
        const cutHeight = 2 + (i * 2.2);
        ctx.fillRect(sunX - sunR - 10, startY, sunR * 2 + 20, cutHeight);
      }
      ctx.restore();

      // Sunset radial glow
      ctx.save();
      const sunGlow = ctx.createRadialGradient(sunX, sunY, sunR * 0.8, sunX, sunY, sunR * 1.6);
      sunGlow.addColorStop(0, 'rgba(255, 107, 157, 0.25)');
      sunGlow.addColorStop(1, 'rgba(255, 51, 102, 0)');
      ctx.fillStyle = sunGlow;
      ctx.beginPath();
      ctx.arc(sunX, sunY, sunR * 1.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 3. Neon Mountain Outlines (glowing wireframe)
    ctx.strokeStyle = '#FF6B9D';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#FF6B9D';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.moveTo(0, horizon);
    ctx.lineTo(w * 0.12, horizon - 70);
    ctx.lineTo(w * 0.22, horizon - 25);
    ctx.lineTo(w * 0.35, horizon - 100);
    ctx.lineTo(w * 0.5, horizon - 35);
    ctx.lineTo(w * 0.65, horizon - 80);
    ctx.lineTo(w * 0.76, horizon - 20);
    ctx.lineTo(w * 0.88, horizon - 90);
    ctx.lineTo(w, horizon);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Fill mountains with dark purple linear gradient
    ctx.save();
    const mountGrad = ctx.createLinearGradient(0, horizon - 100, 0, horizon);
    mountGrad.addColorStop(0, 'rgba(28, 10, 58, 0.85)');
    mountGrad.addColorStop(1, '#12052B');
    ctx.fillStyle = mountGrad;
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // 4. 3D Perspective Grid
    const gridHeight = h - horizon;
    ctx.lineWidth = 1.5;
    ctx.shadowBlur = 4;
    ctx.shadowColor = '#00D4FF';

    this.offset = (this.offset + 0.6) % 40;

    // Horizontal Lines (scrolling + perspective spacing)
    const numHorizLines = 14;
    for (let i = 0; i < numHorizLines; i++) {
      const normY = (i + this.offset / 40) / numHorizLines;
      const relativeY = Math.pow(normY, 2.2);
      const lineY = horizon + relativeY * gridHeight;
      const opacity = normY * 0.7;

      ctx.strokeStyle = `rgba(0, 212, 255, ${opacity})`;
      ctx.beginPath();
      ctx.moveTo(0, lineY);
      ctx.lineTo(w, lineY);
      ctx.stroke();
    }

    // Vertical Lines (vanishing at center-horizon)
    const numVertLines = 28;
    const vanishX = w * 0.5;
    ctx.strokeStyle = 'rgba(0, 212, 255, 0.2)';
    for (let i = 0; i <= numVertLines; i++) {
      const xPosAtBottom = (i / numVertLines) * w * 2.4 - (w * 0.7);
      ctx.beginPath();
      ctx.moveTo(vanishX, horizon);
      ctx.lineTo(xPosAtBottom, h);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;

    // 5. Floating Geometries
    for (let i = this.shapes.length - 1; i >= 0; i--) {
      const sh = this.shapes[i];
      sh.y -= sh.speed;
      sh.rotation += sh.rotSpeed;
      if (sh.y < -30) {
        this.shapes.splice(i, 1);
        this._spawnShape(false);
        continue;
      }
      ctx.save();
      ctx.translate(sh.x, sh.y);
      ctx.rotate(sh.rotation);
      ctx.strokeStyle = sh.color;
      ctx.lineWidth = 1.5;
      ctx.shadowColor = sh.color;
      ctx.shadowBlur = 4;
      ctx.globalAlpha = Math.min(0.5, sh.y / 200);

      if (sh.type === 'triangle') {
        ctx.beginPath();
        ctx.moveTo(0, -sh.size * 0.6);
        ctx.lineTo(sh.size * 0.5, sh.size * 0.4);
        ctx.lineTo(-sh.size * 0.5, sh.size * 0.4);
        ctx.closePath();
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.moveTo(-sh.size * 0.5, 0);
        ctx.lineTo(sh.size * 0.5, 0);
        ctx.moveTo(0, -sh.size * 0.5);
        ctx.lineTo(0, sh.size * 0.5);
        ctx.stroke();
      }
      ctx.restore();
    }

    this._raf = requestAnimationFrame(() => this._loop());
  }

  destroy() {
    this.running = false;
    cancelAnimationFrame(this._raf);
    window.removeEventListener('resize', this._onResize);
    this.canvas.remove();
  }
}

// ── Anime (Manga speed lines, rising energy sparks & floating interactive mascot) ──

class AnimeEngine {
  constructor(container) {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'theme-canvas';
    container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');
    this.running = true;
    this.speedLines = [];
    this.sparks = [];

    // Inject Mascot-chan image
    this.mascot = document.createElement('img');
    this.mascot.src = 'anime-girl.png';
    this.mascot.className = 'anime-mascot';
    this.mascot.alt = 'AI Mascot Helper';
    this.mascot.title = 'Click me for advice!';
    
    const messages = [
      "Ganbare! Checking the models for sneaky hallucinations! 💥",
      "LLMs love to sound 100% confident even when they make things up! Be careful! 🧠",
      "Click on settings ⚙ if you want to swap out the evaluator models!",
      "I'm Mascot-chan, your AI audit assistant! Let's find those citation gaps! 📚",
      "Notice how adding context in the Context Injector changes the results? Pretty neat, right? ✨",
      "Confidence Map view highlights exact uncertainty levels. Check it out! 🎨",
      "Remember: 'cannot assess' means the AI auditor lacked confidence to judge. You can override it! ⚑",
      "Temporal confusion is when the AI mixes up dates or timelines. Watch out for it! 🕑",
      "Need a quiz? Open the 'Tools & Learn' menu to test your hallucination detection skills! 🧠",
      "Did you know? Confident wrongness is the hardest type of hallucination to catch! 🔍"
    ];

    this.mascot.onclick = () => {
      const msg = messages[Math.floor(Math.random() * messages.length)];
      if (typeof showToast === 'function') {
        showToast(`Mascot-chan: "${msg}"`, 'info', 4500);
      }
      this.mascot.classList.add('mascot-bump');
      setTimeout(() => this.mascot.classList.remove('mascot-bump'), 400);
    };

    document.body.appendChild(this.mascot);

    this._resize();
    this._onResize = () => this._resize();
    window.addEventListener('resize', this._onResize);
    this._loop();
  }

  _resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this._initElements();
  }

  _initElements() {
    this.speedLines = [];
    for (let i = 0; i < 15; i++) {
      this.speedLines.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        length: 80 + Math.random() * 180,
        speed: 10 + Math.random() * 20,
        width: 1 + Math.random() * 2,
        opacity: 0.05 + Math.random() * 0.15
      });
    }

    this.sparks = [];
    for (let i = 0; i < 25; i++) {
      this.sparks.push({
        x: Math.random() * this.canvas.width,
        y: this.canvas.height + Math.random() * 100,
        size: 2 + Math.random() * 4,
        speedY: 1 + Math.random() * 2.5,
        speedX: -0.5 + Math.random() * 1,
        color: ['#FF7A30', '#30D0FF', '#FF4A60', '#FFFFFF'][Math.floor(Math.random() * 4)],
        alpha: 0.3 + Math.random() * 0.5,
        decay: 0.002 + Math.random() * 0.005
      });
    }
  }

  _loop() {
    if (!this.running) return;
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Dynamic mascot expression based on app state
    if (typeof STATE !== 'undefined') {
      if (STATE.loading) {
        if (!this.mascot.src.endsWith('anime-girl-thinking.png')) {
          this.mascot.src = 'anime-girl-thinking.png';
        }
      } else if (STATE.adversarialPrompt && STATE.hallucinatorResults.length > 0) {
        if (!this.mascot.src.endsWith('anime-girl-happy.png')) {
          this.mascot.src = 'anime-girl-happy.png';
        }
      } else {
        if (!this.mascot.src.endsWith('anime-girl.png')) {
          this.mascot.src = 'anime-girl.png';
        }
      }
    }

    ctx.clearRect(0, 0, w, h);

    // 1. Draw shonen speed lines
    for (let line of this.speedLines) {
      line.x -= line.speed;
      if (line.x + line.length < 0) {
        line.x = w + Math.random() * 100;
        line.y = Math.random() * h;
        line.length = 80 + Math.random() * 180;
        line.speed = 10 + Math.random() * 20;
      }
      ctx.strokeStyle = `rgba(48, 208, 255, ${line.opacity})`;
      ctx.lineWidth = line.width;
      ctx.beginPath();
      ctx.moveTo(line.x, line.y);
      ctx.lineTo(line.x + line.length, line.y);
      ctx.stroke();
    }

    // 2. Draw rising energy sparks
    for (let sp of this.sparks) {
      sp.y -= sp.speedY;
      sp.x += sp.speedX;
      sp.alpha -= sp.decay;
      if (sp.alpha <= 0 || sp.y < -20) {
        sp.y = h + 10 + Math.random() * 50;
        sp.x = Math.random() * w;
        sp.alpha = 0.3 + Math.random() * 0.5;
        sp.color = ['#FF7A30', '#30D0FF', '#FF4A60', '#FFFFFF'][Math.floor(Math.random() * 4)];
      }
      ctx.fillStyle = sp.color;
      ctx.shadowColor = sp.color;
      ctx.shadowBlur = 6;
      ctx.globalAlpha = Math.max(0, sp.alpha);
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, sp.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;

    this._raf = requestAnimationFrame(() => this._loop());
  }

  destroy() {
    this.running = false;
    cancelAnimationFrame(this._raf);
    window.removeEventListener('resize', this._onResize);
    this.canvas.remove();
    if (this.mascot) {
      this.mascot.remove();
    }
  }
}
