/* ===================================================================
   Covanreach Media — golden shooting stars

   A single fixed canvas sitting behind every section. Occasional gold
   streaks arc across and fade out.

   Deliberately restrained: low alpha, thin trails, and never more than
   a few at once, so body copy stays readable. It sits at z-index 0 with
   pointer-events:none, so it can't intercept clicks or cover text.

   Honours prefers-reduced-motion (renders nothing), pauses when the tab
   is hidden, and no-ops entirely if 2D canvas is unavailable.
   =================================================================== */

(function () {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) return;

  const canvas = document.getElementById('stars');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  let w = 0, h = 0, dpr = 1;
  let raf = null, running = false;

  function size() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  size();
  window.addEventListener('resize', size);

  /* ---------- a single streak ---------- */
  const stars = [];

  // Fewer on small screens — less room, and it's a battery cost.
  const MAX = w < 760 ? 3 : 6;

  function spawn() {
    // Travel down-right at a shallow angle, like a real meteor.
    const angle = (Math.PI / 180) * (18 + Math.random() * 16);
    const speed = 5.5 + Math.random() * 5;

    stars.push({
      // start off the top-left edge somewhere along the diagonal
      x: Math.random() * w * 1.15 - w * 0.15,
      y: -40 - Math.random() * h * 0.25,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      len: 110 + Math.random() * 160,
      life: 0,
      // total frames this streak lives for
      max: 150 + Math.random() * 90,
      // Peak opacity. Still well under half so body copy stays readable,
      // but high enough to actually register as you scroll.
      peak: 0.30 + Math.random() * 0.26,
      width: 1.0 + Math.random() * 1.0
    });
  }

  function draw() {
    raf = requestAnimationFrame(draw);
    ctx.clearRect(0, 0, w, h);

    if (stars.length < MAX && Math.random() < 0.022) spawn();

    for (let i = stars.length - 1; i >= 0; i--) {
      const s = stars[i];
      s.x += s.vx;
      s.y += s.vy;
      s.life++;

      // fade in over the first 20%, out over the last 45%
      const p = s.life / s.max;
      let alpha;
      if (p < 0.2) alpha = (p / 0.2) * s.peak;
      else if (p > 0.55) alpha = (1 - (p - 0.55) / 0.45) * s.peak;
      else alpha = s.peak;

      if (p >= 1 || s.x - s.len > w || s.y - s.len > h) {
        stars.splice(i, 1);
        continue;
      }
      if (alpha <= 0) continue;

      // trail runs back along the direction of travel
      const mag = Math.hypot(s.vx, s.vy) || 1;
      const tx = s.x - (s.vx / mag) * s.len;
      const ty = s.y - (s.vy / mag) * s.len;

      const grad = ctx.createLinearGradient(s.x, s.y, tx, ty);
      grad.addColorStop(0, `rgba(243,215,132,${alpha})`);
      grad.addColorStop(0.35, `rgba(212,175,55,${alpha * 0.45})`);
      grad.addColorStop(1, 'rgba(212,175,55,0)');

      ctx.strokeStyle = grad;
      ctx.lineWidth = s.width;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(s.x, s.y);
      ctx.stroke();

      // a small bright head
      ctx.fillStyle = `rgba(247,230,170,${alpha * 0.9})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.width * 0.9, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function start() { if (!running) { running = true; draw(); } }
  function stop() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = null;
    ctx.clearRect(0, 0, w, h);
  }

  document.addEventListener('visibilitychange', () => {
    document.hidden ? stop() : start();
  });

  start();
})();
