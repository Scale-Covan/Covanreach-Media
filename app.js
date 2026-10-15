/* ===================================================================
   Covanreach Media — interactions
   =================================================================== */

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

document.getElementById('yr').textContent = new Date().getFullYear();

/* ---------- Scroll progress + sticky nav ---------- */
const nav = document.getElementById('nav');
const bar = document.getElementById('progress');

function onScroll() {
  const y = window.scrollY;
  const h = document.documentElement.scrollHeight - window.innerHeight;
  bar.style.width = (h > 0 ? (y / h) * 100 : 0) + '%';
  nav.classList.toggle('stuck', y > 30);
}
onScroll();
window.addEventListener('scroll', onScroll, { passive: true });

/* ---------- Mobile drawer ---------- */
const burger = document.getElementById('burger');
const drawer = document.getElementById('drawer');

burger.addEventListener('click', () => {
  const open = drawer.classList.toggle('open');
  burger.classList.toggle('x', open);
  burger.setAttribute('aria-expanded', String(open));
});
drawer.querySelectorAll('a').forEach(a =>
  a.addEventListener('click', () => {
    drawer.classList.remove('open');
    burger.classList.remove('x');
    burger.setAttribute('aria-expanded', 'false');
  })
);

/* ---------- Cursor spotlight (desktop, fine pointer only) ---------- */
const spot = document.getElementById('spotlight');
if (!reduced && window.matchMedia('(pointer: fine)').matches) {
  let tx = 0, ty = 0, cx = 0, cy = 0, active = false;

  window.addEventListener('mousemove', e => {
    tx = e.clientX; ty = e.clientY;
    if (!active) { active = true; spot.style.opacity = '1'; cx = tx; cy = ty; }
  });
  document.addEventListener('mouseleave', () => { spot.style.opacity = '0'; });

  (function trail() {
    cx += (tx - cx) * 0.12;
    cy += (ty - cy) * 0.12;
    spot.style.transform = `translate(${cx}px, ${cy}px) translate(-50%, -50%)`;
    requestAnimationFrame(trail);
  })();
}

/* ---------- Magnetic buttons ---------- */
if (!reduced && window.matchMedia('(pointer: fine)').matches) {
  document.querySelectorAll('.magnet').forEach(el => {
    el.addEventListener('mousemove', e => {
      const r = el.getBoundingClientRect();
      const mx = e.clientX - r.left - r.width / 2;
      const my = e.clientY - r.top - r.height / 2;
      el.style.transform = `translate(${mx * 0.18}px, ${my * 0.3}px)`;
    });
    el.addEventListener('mouseleave', () => { el.style.transform = ''; });
  });
}

/* ---------- Reveal on scroll ---------- */
const revealIO = new IntersectionObserver((entries) => {
  entries.forEach(en => {
    if (en.isIntersecting) {
      en.target.classList.add('in');
      revealIO.unobserve(en.target);
    }
  });
}, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

document.querySelectorAll('.rv').forEach(el => revealIO.observe(el));

/* Hero headline word reveal.
   Not inside requestAnimationFrame: rAF is paused while a tab is hidden, which
   would leave the headline stuck off-screen until the tab was focused. */
const heroLine = document.getElementById('heroLine');
setTimeout(() => heroLine.classList.add('lit'), 60);

/* ---------- Scrollspy ---------- */
const sections = ['services', 'process', 'industries', 'data', 'scorecard'];
const linkFor = {};
document.querySelectorAll('.nav-links a, .drawer a').forEach(a => {
  const id = a.getAttribute('href').replace('#', '');
  (linkFor[id] = linkFor[id] || []).push(a);
});

const spyIO = new IntersectionObserver((entries) => {
  entries.forEach(en => {
    if (!en.isIntersecting) return;
    Object.values(linkFor).flat().forEach(a => a.classList.remove('on'));
    (linkFor[en.target.id] || []).forEach(a => a.classList.add('on'));
  });
}, { rootMargin: '-45% 0px -50% 0px' });

sections.forEach(id => {
  const el = document.getElementById(id);
  if (el) spyIO.observe(el);
});

/* ---------- Marquee: base drift + scroll velocity ---------- */
const marq = document.getElementById('marq');
if (!reduced) {
  let offset = 0, lastY = window.scrollY, kick = 0, half = 0;

  const measure = () => { half = marq.scrollWidth / 2; };
  measure();
  window.addEventListener('resize', measure);

  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    kick += (y - lastY) * 0.35;
    lastY = y;
  }, { passive: true });

  (function run() {
    kick *= 0.92;                       // decay the scroll impulse
    offset -= 0.55 + kick;              // constant drift + scroll push
    if (half) {
      if (offset <= -half) offset += half;
      if (offset > 0) offset -= half;
    }
    marq.style.transform = `translateX(${offset}px)`;
    requestAnimationFrame(run);
  })();
}

/* ---------- Services switcher ---------- */
const tabs = document.querySelectorAll('.svc-tab');
const panes = document.querySelectorAll('.svc-pane');

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const i = tab.dataset.svc;
    tabs.forEach(t => { t.classList.remove('on'); t.setAttribute('aria-selected', 'false'); });
    tab.classList.add('on');
    tab.setAttribute('aria-selected', 'true');
    panes.forEach(p => p.classList.toggle('on', p.dataset.pane === i));
  });
});

/* ---------- Process rail fill ---------- */
const rail = document.getElementById('rail');
const railFill = document.getElementById('railFill');
const steps = document.querySelectorAll('.step');

if (rail) {
  const railIO = new IntersectionObserver((entries) => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      railFill.style.width = '100%';
      steps.forEach((s, i) => setTimeout(() => s.classList.add('live'), 220 * i));
      railIO.unobserve(en.target);
    });
  }, { threshold: 0.4 });
  railIO.observe(rail);
}

/* ---------- Industries ---------- */

/* Inline line icons — stroke inherits the gold via currentColor */
const S = (paths) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" ` +
  `stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;

const ICON = {
  camera:   S('<path d="M3.5 8.5h3L8 6.5h8l1.5 2h3v10h-17z"/><circle cx="12" cy="13" r="3.2"/>'),
  phone:    S('<rect x="7" y="2.5" width="10" height="19" rx="2"/><path d="M11 18.5h2"/>'),
  star:     S('<path d="M12 4l2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.6-4.8 2.6.9-5.4L4.2 9.7l5.4-.8z"/>'),
  calendar: S('<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17"/><path d="M8 3v4"/><path d="M16 3v4"/>'),
  chart:    S('<path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-7"/><path d="M3 20h18"/>'),
  search:   S('<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>'),
  pin:      S('<path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11z"/><circle cx="12" cy="10" r="2.6"/>'),
  user:     S('<circle cx="12" cy="8" r="3.6"/><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0"/>'),
  home:     S('<path d="M3 10.5L12 3l9 7.5"/><path d="M5.5 9.5V20h13V9.5"/><path d="M10 20v-5.5h4V20"/>'),
  globe:    S('<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17"/><path d="M12 3.5c4 4.5 4 12.5 0 17-4-4.5-4-12.5 0-17z"/>'),
  tool:     S('<path d="M14.5 5.5a4 4 0 0 0-5.4 5.2L4 15.8 6.2 18l5.1-5.1a4 4 0 0 0 5.2-5.4l-2.4 2.4-2.1-2.1z"/><path d="M15 15l5 5"/>'),
  note:     S('<circle cx="7" cy="17.5" r="2.8"/><circle cx="18" cy="15.5" r="2.8"/><path d="M9.8 17.5V6.5l11-2v11"/>'),
  trophy:   S('<path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 5.5H4.5V7a3 3 0 0 0 3 3"/><path d="M17 5.5h2.5V7a3 3 0 0 1-3 3"/><path d="M12 14v3"/><path d="M8.5 20h7"/>'),
  scissors: S('<circle cx="6" cy="6" r="2.4"/><circle cx="6" cy="18" r="2.4"/><path d="M8 7.5L20 18"/><path d="M8 16.5L20 6"/>'),
  dumbbell: S('<path d="M3 9v6"/><path d="M21 9v6"/><path d="M6.5 6.5v11"/><path d="M17.5 6.5v11"/><path d="M6.5 12h11"/>'),
  handshake:S('<path d="M8 12l2.5-2.5 2 2 2-2L17 12"/><path d="M3 10l3-3 3 2"/><path d="M21 10l-3-3-3 2"/><path d="M8 12l-2 2 4 4 2-2"/>'),
  plate:    S('<path d="M4 3v8a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2V3"/><path d="M6 13v8"/><path d="M17 3c-1.7 1.2-2.5 3-2.5 5.5S15.3 13 17 14v7"/>'),
  car:      S('<path d="M5 13l1.6-4.8A2 2 0 0 1 8.5 7h7a2 2 0 0 1 1.9 1.2L19 13"/><path d="M3 13h18v4a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1v-1H6v1a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><circle cx="7.5" cy="15.5" r=".6" fill="currentColor"/><circle cx="16.5" cy="15.5" r=".6" fill="currentColor"/>')
};

const INDUSTRIES = [
  {
    name: 'Restaurants &amp; Cafés',
    copy: 'Food is the easiest thing in the world to film and the most under-shot. We cover the plate, the pour, the kitchen, and the room — then keep your Google listing current so the lunch crowd finds you first.',
    tags: ['Menu reels', 'Daily specials', 'Google Profile', 'Review replies'],
    shots: [
      [ICON.plate, 'Dish and prep footage shot on location'],
      [ICON.phone, 'Specials posted the morning they run'],
      [ICON.star, 'Review responses handled for you']
    ]
  },
  {
    name: 'Auto &amp; Detailing',
    copy: 'Shops, detailers, dealers, and wrap installers. Before-and-after is some of the highest-performing content on any platform, and almost nobody in this trade is shooting it properly.',
    tags: ['Before / after', 'Build features', 'Car meets', 'Service ads'],
    shots: [
      [ICON.car, 'Before-and-after cuts that hold attention'],
      [ICON.camera, 'Full event roll-through at meets and shows'],
      [ICON.search, 'Google Ads for "near me" service searches']
    ]
  },
  {
    name: 'Barbershops &amp; Salons',
    copy: 'Your chair work is the portfolio. We shoot the transformation, cut it vertical, and keep your booking link in front of the people who live within a few miles of you.',
    tags: ['Transformations', 'Booking ads', 'Chair features', 'Reviews'],
    shots: [
      [ICON.scissors, 'Transformation reels, start to finish'],
      [ICON.calendar, 'Ads pointed straight at your booking link'],
      [ICON.user, 'Individual barber and stylist features']
    ]
  },
  {
    name: 'Gyms &amp; Fitness',
    copy: 'Trainers, studios, and gyms live and die on local reach. We film the floor, the coaches, and the member stories, then run sign-up campaigns against your actual service radius.',
    tags: ['Class promos', 'Trainer features', 'Sign-up ads', 'Member stories'],
    shots: [
      [ICON.dumbbell, 'Floor and class footage that looks full'],
      [ICON.user, 'Coach features that build the roster'],
      [ICON.chart, 'Sign-up campaigns with tracked cost per lead']
    ]
  },
  {
    name: 'Real Estate &amp; Property',
    copy: 'Walkthroughs, 360 tours, and orbit shots that make a listing feel like a visit before anybody drives out. Agent branding content so sellers remember who to call.',
    tags: ['Walkthroughs', '360 tours', 'Agent branding', 'Listing reels'],
    shots: [
      [ICON.home, 'Full property walkthroughs on a gimbal'],
      [ICON.globe, 'Insta360 tours and exterior orbits'],
      [ICON.user, 'Personal brand content for the agent']
    ]
  },
  {
    name: 'Contractors &amp; Home Services',
    copy: 'HVAC, roofing, landscaping, remodels. Job-site footage plus Google Ads is the most direct path from a stranger searching at 9pm to your phone ringing at 9am.',
    tags: ['Job-site reels', 'Google Ads', 'Service areas', 'Before / after'],
    shots: [
      [ICON.tool, 'Job-site and finished-work footage'],
      [ICON.phone, 'Google Ads built around emergency searches'],
      [ICON.pin, 'Service-area targeting that matches your trucks']
    ]
  },
  {
    name: 'Musicians &amp; Artists',
    copy: 'Music videos short and full length, plus the short-form cuts that actually get the track in front of people. Release rollouts planned so the song does not land to silence.',
    tags: ['Music videos', 'Performance clips', 'Release rollouts', 'Visualizers'],
    shots: [
      [ICON.note, 'Music videos, single or multi-location'],
      [ICON.camera, 'Short-form cuts built from the same shoot'],
      [ICON.calendar, 'Rollout calendar around the release date']
    ]
  },
  {
    name: 'Events &amp; Sports',
    copy: 'Car meets, tournaments, shows, and leagues. Full roll-through coverage with same-week recaps, billed weekly or monthly depending on your season.',
    tags: ['Event coverage', 'Recap edits', 'Sponsor reels', 'Weekly billing'],
    shots: [
      [ICON.camera, 'Full event coverage, start to finish'],
      [ICON.trophy, 'Recap edits out while people still care'],
      [ICON.handshake, 'Sponsor-facing cuts for your partners']
    ]
  }
];

const chips = document.querySelectorAll('.chip');
const indPanel = document.getElementById('indPanel');

function renderIndustry(i) {
  const d = INDUSTRIES[i];
  indPanel.innerHTML = `
    <div class="ind-copy">
      <h3>${d.name}</h3>
      <p>${d.copy}</p>
      <div class="ind-tags">${d.tags.map(t => `<span>${t}</span>`).join('')}</div>
    </div>
    <div class="ind-shots">
      ${d.shots.map(s => `
        <div class="ind-shot"><span class="ico">${s[0]}</span><span class="tx">${s[1]}</span></div>
      `).join('')}
    </div>`;
  indPanel.style.animation = 'none';
  void indPanel.offsetWidth;
  if (!reduced) indPanel.style.animation = 'fadeUp .45s var(--ease) both';
}

chips.forEach(chip => {
  chip.addEventListener('click', () => {
    chips.forEach(c => c.classList.remove('on'));
    chip.classList.add('on');
    renderIndustry(Number(chip.dataset.ind));
  });
});
renderIndustry(0);

/* ---------- Animated counters ---------- */
const counters = document.querySelectorAll('[data-count]');
const countIO = new IntersectionObserver((entries) => {
  entries.forEach(en => {
    if (!en.isIntersecting) return;
    const el = en.target;
    const target = Number(el.dataset.count);
    const suffix = el.dataset.suffix || '';

    if (reduced) { el.textContent = target + suffix; countIO.unobserve(el); return; }

    const dur = 1500;
    const t0 = performance.now();
    (function tick(now) {
      const p = Math.min((now - t0) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    })(t0);

    countIO.unobserve(el);
  });
}, { threshold: 0.5 });
counters.forEach(c => countIO.observe(c));

/* ---------- Visibility scorecard ---------- */
const QUESTIONS = [
  { q: 'Have you claimed your Google Business Profile?', w: 18 },
  { q: 'Is your primary Google category set correctly?', w: 16 },
  { q: 'Do you post at least 3 times a week?', w: 14 },
  { q: 'Do you reply to every review you get?', w: 13 },
  { q: 'Have you gotten a new review in the last 30 days?', w: 13 },
  { q: 'Do you have recent photo or video of the actual business?', w: 10 },
  { q: 'Are your hours, phone, and address identical everywhere online?', w: 9 },
  { q: 'Are you running any paid ads right now?', w: 7 }
];

const scoreQ = document.getElementById('scoreQ');
const ring = document.getElementById('ring');
const scoreNum = document.getElementById('scoreNum');
const scoreTitle = document.getElementById('scoreTitle');
const scoreMsg = document.getElementById('scoreMsg');
const scoreField = document.getElementById('scoreField');
const answers = new Array(QUESTIONS.length).fill(null);

const CIRC = 2 * Math.PI * 78;
ring.setAttribute('stroke-dasharray', CIRC);
ring.setAttribute('stroke-dashoffset', CIRC);

scoreQ.innerHTML = QUESTIONS.map((item, i) => `
  <div class="q">
    <span class="qt">${item.q}</span>
    <span class="toggle">
      <button class="yes" data-i="${i}" data-v="1" aria-label="Yes">Yes</button>
      <button class="no"  data-i="${i}" data-v="0" aria-label="No">No</button>
    </span>
  </div>`).join('');

function updateScore() {
  const answered = answers.filter(a => a !== null).length;
  let earned = 0, possible = 0;

  answers.forEach((a, i) => {
    if (a === null) return;
    possible += QUESTIONS[i].w;
    if (a === 1) earned += QUESTIONS[i].w;
  });

  const pct = possible ? Math.round((earned / possible) * 100) : 0;

  scoreNum.textContent = pct;
  ring.setAttribute('stroke-dashoffset', CIRC - (CIRC * pct) / 100);

  if (answered === 0) {
    scoreTitle.textContent = 'Answer the questions';
    scoreMsg.textContent = 'Tap yes or no on each one and your score builds as you go.';
    scoreField.value = 'not completed';
    return;
  }

  scoreField.value = `${pct}/100 (${answered}/${QUESTIONS.length} answered)`;

  if (answered < QUESTIONS.length) {
    scoreTitle.textContent = `${answered} of ${QUESTIONS.length} answered`;
    scoreMsg.textContent = 'Keep going — the score updates with every answer.';
  } else if (pct >= 80) {
    scoreTitle.textContent = 'You’re in good shape';
    scoreMsg.textContent = 'The fundamentals are covered. The gap now is volume and consistency — more content, more often, pointed at the right radius.';
  } else if (pct >= 50) {
    scoreTitle.textContent = 'Solid base, real gaps';
    scoreMsg.textContent = 'You’re doing some of it. The missing pieces are the cheap ones to fix, and they carry the most ranking weight.';
  } else if (pct >= 25) {
    scoreTitle.textContent = 'You’re leaving a lot on the table';
    scoreMsg.textContent = 'Most of what’s missing here is free to fix and weighted heavily. This is usually the fastest win we find.';
  } else {
    scoreTitle.textContent = 'Nearly invisible locally';
    scoreMsg.textContent = 'Good news: almost everything scored here costs nothing but time to correct. Start with the Google Profile.';
  }
}

scoreQ.addEventListener('click', e => {
  const btn = e.target.closest('button[data-i]');
  if (!btn) return;
  const i = Number(btn.dataset.i);
  const v = Number(btn.dataset.v);
  answers[i] = v;

  const row = btn.closest('.q');
  row.querySelectorAll('button').forEach(b => b.classList.remove('on'));
  btn.classList.add('on');

  updateScore();
});

updateScore();

/* ---------- Contact form ---------- */
const form = document.getElementById('form');
const status = document.getElementById('status');
const submit = document.getElementById('submit');
const btnText = document.getElementById('btnText');

form.addEventListener('submit', async e => {
  e.preventDefault();
  status.textContent = '';
  status.className = 'status';
  submit.disabled = true;
  btnText.textContent = 'Sending…';

  try {
    const res = await fetch(form.action, {
      method: 'POST',
      body: new FormData(form),
      headers: { Accept: 'application/json' }
    });

    if (res.ok) {
      form.reset();
      status.textContent = 'Thanks — we’ll be in touch within one business day.';
      status.classList.add('ok');
    } else {
      const data = await res.json().catch(() => null);
      status.textContent = data?.errors?.length
        ? data.errors.map(x => x.message).join(', ')
        : 'Something went wrong. Please try again or email us directly.';
      status.classList.add('err');
    }
  } catch {
    status.textContent = 'Network error — check your connection and try again.';
    status.classList.add('err');
  } finally {
    submit.disabled = false;
    btnText.textContent = 'Send Message';
  }
});
