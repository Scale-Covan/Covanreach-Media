/* ===================================================================
   Chat widget.

   Deliberately not spammy: it never opens itself, never nags, and the
   launcher is a quiet button rather than a bouncing bubble with an
   unread badge. The visitor opens it or it stays shut.

   Talks to /api/chat, which holds the API key server-side.
   =================================================================== */

(function () {
  const root = document.getElementById('chat');
  if (!root) return;

  const launcher = document.getElementById('chatLauncher');
  const panel = document.getElementById('chatPanel');
  const closeBtn = document.getElementById('chatClose');
  const log = document.getElementById('chatLog');
  const form = document.getElementById('chatForm');
  const input = document.getElementById('chatInput');
  const send = document.getElementById('chatSend');

  const KEY = 'cr_chat_v1';
  const MAX_CHARS = 1000;

  // [{role, content}] — the transcript we send to the server.
  let history = [];
  let busy = false;

  /* ---------- transcript persistence (this tab only) ---------- */
  function save() {
    try { sessionStorage.setItem(KEY, JSON.stringify(history)); } catch (e) { /* private mode */ }
  }
  function load() {
    try {
      const raw = sessionStorage.getItem(KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) history = parsed.slice(-24);
    } catch (e) { history = []; }
  }

  /* ---------- rendering ---------- */
  function bubble(role, text) {
    const row = document.createElement('div');
    row.className = 'chat-row ' + (role === 'user' ? 'is-user' : 'is-shea');

    if (role !== 'user') {
      const av = document.createElement('span');
      av.className = 'chat-av';
      av.setAttribute('aria-hidden', 'true');
      row.appendChild(av);
    }

    const b = document.createElement('div');
    b.className = 'chat-bubble';
    // textContent, never innerHTML — the reply is model output and must
    // not be able to inject markup into the page.
    b.textContent = text;
    row.appendChild(b);

    log.appendChild(row);
    log.scrollTop = log.scrollHeight;
    return row;
  }

  function typing() {
    const row = document.createElement('div');
    row.className = 'chat-row is-shea';
    row.innerHTML =
      '<span class="chat-av" aria-hidden="true"></span>' +
      '<div class="chat-bubble chat-typing"><i></i><i></i><i></i></div>';
    log.appendChild(row);
    log.scrollTop = log.scrollHeight;
    return row;
  }

  function greet() {
    bubble('assistant',
      "Hey — Shea here. Ask me anything about running ads, rebuilding your site, or how any of this would work for your business.");
  }

  function render() {
    log.innerHTML = '';
    if (history.length === 0) {
      greet();
      suggestions();
    } else {
      history.forEach(m => bubble(m.role, m.content));
    }
  }

  /* ---------- opening questions ---------- */
  const CHIPS = [
    'What would you do for my business?',
    'How does the free first month work?',
    'My site is outdated — can you rebuild it?'
  ];

  function suggestions() {
    const wrap = document.createElement('div');
    wrap.className = 'chat-chips';
    CHIPS.forEach(text => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chat-chip';
      b.textContent = text;
      b.addEventListener('click', () => {
        wrap.remove();
        ask(text);
      });
      wrap.appendChild(b);
    });
    log.appendChild(wrap);
    log.scrollTop = log.scrollHeight;
  }

  /* ---------- sending ---------- */
  async function ask(text) {
    if (busy) return;
    const clean = text.trim().slice(0, MAX_CHARS);
    if (!clean) return;

    const chips = log.querySelector('.chat-chips');
    if (chips) chips.remove();

    busy = true;
    send.disabled = true;
    input.value = '';

    history.push({ role: 'user', content: clean });
    bubble('user', clean);
    save();

    const t = typing();

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history })
      });

      const data = await res.json().catch(() => null);
      t.remove();

      if (!res.ok) {
        bubble('assistant', (data && data.error)
          ? data.error
          : "Something went wrong on my end. Try again, or just email scale@covanreachmedia.com.");
        return;
      }

      const reply = (data && data.reply) || '';
      if (reply) {
        history.push({ role: 'assistant', content: reply });
        bubble('assistant', reply);
        save();
      }
    } catch (err) {
      t.remove();
      bubble('assistant',
        "Lost connection there. Try again, or email scale@covanreachmedia.com and I'll come back to you.");
    } finally {
      busy = false;
      send.disabled = false;
      input.focus();
    }
  }

  /* ---------- open / close ---------- */
  let lastFocus = null;

  function open() {
    lastFocus = document.activeElement;
    root.classList.add('is-open');
    launcher.setAttribute('aria-expanded', 'true');
    panel.hidden = false;
    if (!log.childElementCount) render();
    setTimeout(() => input.focus(), 60);
  }

  function close() {
    root.classList.remove('is-open');
    launcher.setAttribute('aria-expanded', 'false');
    panel.hidden = true;
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  launcher.addEventListener('click', () => {
    root.classList.contains('is-open') ? close() : open();
  });
  closeBtn.addEventListener('click', close);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && root.classList.contains('is-open')) close();
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    ask(input.value);
  });

  // Enter sends, Shift+Enter makes a new line.
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      ask(input.value);
    }
  });

  // Grow the box with the text, up to a ceiling.
  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 120) + 'px';
  });

  load();
})();
