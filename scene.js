/* ===================================================================
   Covanreach Media — hero 3D logo cube

   A cube carrying the logo on all six faces. It spins as the visitor
   scrolls through the hero, then hands the page over.

   ---------------------------------------------------------------
   TO USE THE REAL LOGO: drop a square image named `logo.png` in the
   project root. It is picked up automatically — no code change.
   A transparent PNG around 512x512 or 1024x1024 works best.
   ---------------------------------------------------------------

   Everything here is decorative. If WebGL is unavailable, three.js
   fails to load, or the visitor prefers reduced motion, the hero
   still reads normally.
   =================================================================== */

(function () {
  const host = document.getElementById('scene');
  if (!host) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (typeof THREE === 'undefined') return;

  try {
    const probe = document.createElement('canvas');
    if (!(probe.getContext('webgl') || probe.getContext('experimental-webgl'))) return;
  } catch (e) { return; }

  const GOLD = 0xD4AF37;
  const GOLD_BR = 0xF3D784;

  let renderer, scene, camera, rig, cube, raf = null, running = false;
  // True once logo.png is in place, so the fallback never overwrites it.
  let usingRealLogo = false;

  /* ---------- fallback face texture ----------
     Drawn on a canvas so the cube has a real mark on it before any
     logo.png exists. Replaced the moment that file is added.        */
  function makeFallbackTexture() {
    const S = 512;
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const x = c.getContext('2d');

    // panel
    x.fillStyle = '#0E0E12';
    x.fillRect(0, 0, S, S);

    // inset gold frame
    x.strokeStyle = 'rgba(212,175,55,.55)';
    x.lineWidth = 6;
    x.strokeRect(38, 38, S - 76, S - 76);

    // monogram
    x.fillStyle = '#E8C45C';
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.font = '700 300px "Cormorant Garamond", Georgia, serif';
    x.fillText('C', S / 2, S / 2 - 24);

    // wordmark
    x.fillStyle = 'rgba(244,241,234,.78)';
    x.font = '800 30px Manrope, system-ui, sans-serif';
    x.letterSpacing = '8px';
    x.fillText('COVANREACH', S / 2, S / 2 + 150);

    const t = new THREE.Texture(c);
    t.needsUpdate = true;
    return t;
  }

  /* ---------- build ---------- */
  function build() {
    const w = host.clientWidth, h = host.clientHeight;
    if (!w || !h) return false;

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h);
    if (THREE.sRGBEncoding) renderer.outputEncoding = THREE.sRGBEncoding;
    host.appendChild(renderer.domElement);

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(38, w / h, 0.1, 100);
    camera.position.set(0, 0, 9);
    camera.lookAt(0, 0, 0);

    // Lifted so every face is evenly lit and the mark reads clearly,
    // rather than half the cube falling into the background.
    scene.add(new THREE.AmbientLight(0xffffff, 0.95));

    const key = new THREE.DirectionalLight(0xfff2d4, 1.45);
    key.position.set(4, 6, 8);
    scene.add(key);

    const rim = new THREE.DirectionalLight(GOLD_BR, 1.6);
    rim.position.set(-6, 2, -4);
    scene.add(rim);

    const fill = new THREE.PointLight(0x9fb6d4, 0.55, 40);
    fill.position.set(-5, -4, 6);
    scene.add(fill);

    rig = new THREE.Group();
    scene.add(rig);

    const SIZE = 3.4;
    // Lambert, not Standard: the standard material's dielectric specular
    // lifts a black texture to charcoal under this much light, so the
    // "black cube" rendered grey. Lambert is diffuse-only — black stays
    // black, faces still differentiate by angle, and the gold reads clean.
    const mat = new THREE.MeshLambertMaterial({
      color: 0xffffff,
      map: makeFallbackTexture()
    });

    cube = new THREE.Mesh(new THREE.BoxGeometry(SIZE, SIZE, SIZE), mat);
    rig.add(cube);

    // Gold edges define the silhouette against the dark page. Drawn at
    // full strength so the cube reads as a solid object, not a smudge.
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(SIZE, SIZE, SIZE)),
      new THREE.LineBasicMaterial({ color: GOLD_BR, transparent: true, opacity: 1 })
    );
    rig.add(edges);

    rig.rotation.set(-0.25, -0.5, 0);

    // Swap in the real logo if one exists. Silent if it doesn't.
    new THREE.TextureLoader().load(
      'logo.png',
      (tex) => {
        if (THREE.sRGBEncoding) tex.encoding = THREE.sRGBEncoding;
        // Anisotropy keeps the mark sharp on faces viewed at an angle;
        // without it the logo smears as the cube turns.
        tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.needsUpdate = true;
        usingRealLogo = true;
        mat.map = tex;
        mat.needsUpdate = true;
        renderer.render(scene, camera);
      },
      undefined,
      () => { /* no logo.png yet — keep the fallback */ }
    );

    return true;
  }

  /* ---------- scroll drives the spin ---------- */
  let scrollSpin = 0;
  function readScroll() {
    // Normalize against the hero's height so the cube does most of its
    // turning across the first screen, then eases off.
    const hero = document.getElementById('hero');
    const span = hero ? hero.offsetHeight : window.innerHeight;
    scrollSpin = (window.scrollY || 0) / Math.max(span, 1);
  }
  readScroll();
  window.addEventListener('scroll', readScroll, { passive: true });

  /* ---------- pointer parallax ---------- */
  const point = { x: 0, y: 0 };
  if (window.matchMedia('(pointer: fine)').matches) {
    window.addEventListener('mousemove', (e) => {
      point.x = (e.clientX / window.innerWidth - 0.5) * 2;
      point.y = (e.clientY / window.innerHeight - 0.5) * 2;
    }, { passive: true });
  }

  /* ---------- loop ---------- */
  let t = 0;
  function frame() {
    raf = requestAnimationFrame(frame);
    t += 0.0035;

    // Scroll is the main driver; a slow idle drift keeps it alive when
    // the visitor hasn't scrolled yet.
    const wantY = -0.5 + scrollSpin * Math.PI * 2.4 + t * 0.25 + point.x * 0.3;
    const wantX = -0.25 + scrollSpin * Math.PI * 0.7 + point.y * 0.18;

    rig.rotation.y += (wantY - rig.rotation.y) * 0.075;
    rig.rotation.x += (wantX - rig.rotation.x) * 0.075;
    rig.position.y = Math.sin(t * 1.4) * 0.1;

    renderer.render(scene, camera);
  }

  function start() { if (!running && !reduced) { running = true; frame(); } }
  function stop() { running = false; if (raf) cancelAnimationFrame(raf); raf = null; }

  function resize() {
    if (!renderer) return;
    const w = host.clientWidth, h = host.clientHeight;
    if (!w || !h) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    renderer.render(scene, camera);
  }

  // The scene can start at 0x0 — hidden by a breakpoint, or inside a tab
  // that isn't laid out yet. Retry on resize instead of giving up for good.
  if (!build()) {
    const retry = () => {
      if (build()) {
        window.removeEventListener('resize', retry);
        finish();
      }
    };
    window.addEventListener('resize', retry);
    return;
  }
  finish();

  function finish() {
  host.classList.add('ready');

  // Draw once regardless, so reduced-motion visitors still see the cube.
  renderer.render(scene, camera);

  // Canvas text needs the webfont; redraw once it lands.
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => {
      if (!usingRealLogo && cube && cube.material) {
        cube.material.map = makeFallbackTexture();
        cube.material.needsUpdate = true;
        renderer.render(scene, camera);
      }
    });
  }

  window.addEventListener('resize', resize);

  const io = new IntersectionObserver((entries) => {
    entries.forEach(en => en.isIntersecting ? start() : stop());
  }, { threshold: 0.05 });
  io.observe(host);

  document.addEventListener('visibilitychange', () => {
    document.hidden ? stop() : start();
  });
  } // end finish()
})();
