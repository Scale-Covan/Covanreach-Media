/* ===================================================================
   POST /api/contact — Vercel serverless function

   Sends two emails on every submission:
     1. A lead notification to the inbox below, with reply-to set to the
        client so you can just hit reply.
     2. A confirmation to the client telling them you'll be in touch.

   SETUP (one time):
     1. Create a free Resend account at resend.com
     2. Verify covanreachmedia.com under Domains (add the DNS records)
     3. In Vercel → Settings → Environment Variables, add:
          RESEND_API_KEY = re_xxxxxxxxxxxx
     4. Redeploy

   Until RESEND_API_KEY exists, this falls back to forwarding the
   submission to Formspree so nothing is ever lost mid-migration.
   =================================================================== */

const TO_EMAIL     = 'scale@covanreachmedia.com';
const FROM_EMAIL   = process.env.FROM_EMAIL || 'Covanreach Media <scale@covanreachmedia.com>';
const FORMSPREE_URL = 'https://formspree.io/f/meeydnzj';

const esc = (s = '') =>
  String(s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const BRAND = {
  bg: '#0c0c10',
  panel: '#15151b',
  gold: '#d4af37',
  goldBright: '#f3d784',
  text: '#f4f1ea',
  dim: '#a9a69e',
  line: 'rgba(212,175,55,0.22)'
};

/* ---------- email 1: the lead, to you ---------- */
function leadEmail(d) {
  const row = (label, value) => value
    ? `<tr>
         <td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,.07);color:${BRAND.dim};font-size:13px;width:170px;vertical-align:top;">${esc(label)}</td>
         <td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,.07);color:${BRAND.text};font-size:15px;">${esc(value)}</td>
       </tr>`
    : '';

  return `<!doctype html><html><body style="margin:0;padding:0;background:${BRAND.bg};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.bg};padding:32px 16px;">
<tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;background:${BRAND.panel};border:1px solid ${BRAND.line};border-radius:6px;overflow:hidden;">
    <tr><td style="padding:28px 32px;border-bottom:1px solid ${BRAND.line};">
      <div style="color:${BRAND.gold};font-size:11px;letter-spacing:.2em;text-transform:uppercase;font-weight:700;font-family:Arial,sans-serif;">New Strategy Call Request</div>
      <div style="color:${BRAND.text};font-size:24px;font-family:Georgia,serif;margin-top:8px;">${esc(d.name || 'Someone')}</div>
    </td></tr>
    <tr><td style="padding:12px 32px 24px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-family:Arial,sans-serif;">
        ${row('Email', d.email)}
        ${row('Phone', d.phone)}
        ${row('Time zone', d.timezone)}
        ${row('Best time to call', d.best_time)}
        ${row('Business type', d.business_type)}
        ${row('Location', d.location)}
        ${row('Monthly ad budget', d.ad_budget)}
        ${row('Visibility score', d.visibility_score)}
      </table>
    </td></tr>
    ${d.message ? `<tr><td style="padding:0 32px 28px;">
      <div style="color:${BRAND.dim};font-size:12px;letter-spacing:.14em;text-transform:uppercase;font-family:Arial,sans-serif;margin-bottom:10px;">What they said</div>
      <div style="color:${BRAND.text};font-size:15px;line-height:1.6;font-family:Arial,sans-serif;white-space:pre-wrap;">${esc(d.message)}</div>
    </td></tr>` : ''}
    <tr><td style="padding:20px 32px;background:rgba(212,175,55,.07);border-top:1px solid ${BRAND.line};">
      <div style="color:${BRAND.dim};font-size:13px;font-family:Arial,sans-serif;">
        Reply straight to this email to reach ${esc(d.name || 'them')}.
      </div>
    </td></tr>
  </table>
</td></tr></table>
</body></html>`;
}

/* ---------- email 2: the confirmation, to them ---------- */
function confirmEmail(d) {
  const first = String(d.name || '').trim().split(/\s+/)[0] || 'there';

  return `<!doctype html><html><body style="margin:0;padding:0;background:${BRAND.bg};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.bg};padding:32px 16px;">
<tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;background:${BRAND.panel};border:1px solid ${BRAND.line};border-radius:6px;overflow:hidden;">
    <tr><td style="padding:34px 34px 10px;text-align:center;">
      <div style="font-family:Georgia,serif;font-size:19px;letter-spacing:.14em;color:${BRAND.text};">
        COVANREACH <span style="color:${BRAND.gold};">MEDIA</span>
      </div>
    </td></tr>
    <tr><td style="padding:18px 34px 0;">
      <div style="color:${BRAND.text};font-size:26px;font-family:Georgia,serif;line-height:1.3;">
        Thanks, ${esc(first)} — we've got it.
      </div>
      <div style="color:${BRAND.dim};font-size:15px;line-height:1.65;font-family:Arial,sans-serif;margin-top:16px;">
        Your request for a free strategy call came through. We'll reach out shortly
        to lock in a day and time that works for you.
      </div>
      <div style="color:${BRAND.dim};font-size:15px;line-height:1.65;font-family:Arial,sans-serif;margin-top:14px;">
        When we talk, we'll look at what you're running now, where the money is
        leaking, and what we'd do first. Thirty minutes, no pitch deck.
      </div>
    </td></tr>
    ${d.best_time ? `<tr><td style="padding:22px 34px 0;">
      <div style="border-left:2px solid ${BRAND.gold};padding:12px 16px;background:rgba(212,175,55,.06);">
        <div style="color:${BRAND.dim};font-size:12px;letter-spacing:.12em;text-transform:uppercase;font-family:Arial,sans-serif;">You told us</div>
        <div style="color:${BRAND.text};font-size:14px;font-family:Arial,sans-serif;margin-top:5px;">
          Best time to reach you: ${esc(d.best_time)}${d.timezone ? ` (${esc(d.timezone)})` : ''}
        </div>
      </div>
    </td></tr>` : ''}
    <tr><td style="padding:26px 34px 34px;">
      <div style="color:${BRAND.dim};font-size:14px;line-height:1.6;font-family:Arial,sans-serif;">
        Need us sooner? Just reply to this email.
      </div>
      <div style="color:#6e6b65;font-size:12px;line-height:1.6;font-family:Arial,sans-serif;margin-top:22px;border-top:1px solid rgba(255,255,255,.07);padding-top:18px;">
        Covanreach Media · Meta ads &amp; website redesigns<br>
        scale@covanreachmedia.com
      </div>
    </td></tr>
  </table>
</td></tr></table>
</body></html>`;
}

async function sendViaResend(key, payload) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Resend ${res.status}: ${body.slice(0, 300)}`);
  }
  return res.json();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const d = req.body && typeof req.body === 'object' ? req.body : {};

  // Honeypot — bots fill hidden fields, humans never see them.
  if (d._gotcha) return res.status(200).json({ ok: true });

  const name = String(d.name || '').trim();
  const email = String(d.email || '').trim();
  const message = String(d.message || '').trim();

  if (!name || !email || !message) {
    return res.status(400).json({ ok: false, error: 'Name, email, and message are required.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ ok: false, error: 'That email address does not look right.' });
  }
  // Cheap abuse guard: refuse absurd payloads.
  if (name.length > 200 || email.length > 320 || message.length > 5000) {
    return res.status(400).json({ ok: false, error: 'That submission is too long.' });
  }

  const key = process.env.RESEND_API_KEY;

  /* ---- Fallback: no Resend key yet, so don't drop the lead ---- */
  if (!key) {
    try {
      const r = await fetch(FORMSPREE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(d)
      });
      if (!r.ok) throw new Error('Formspree rejected the submission');
      return res.status(200).json({ ok: true, via: 'formspree', autoReply: false });
    } catch (err) {
      console.error('Fallback failed:', err);
      return res.status(502).json({ ok: false, error: 'Could not send right now. Please email us directly.' });
    }
  }

  /* ---- Normal path: both emails via Resend ---- */
  try {
    // The lead notification is the one that must not fail silently.
    await sendViaResend(key, {
      from: FROM_EMAIL,
      to: [TO_EMAIL],
      reply_to: email,
      subject: `New strategy call request — ${name}`,
      html: leadEmail(d)
    });
  } catch (err) {
    console.error('Lead notification failed:', err);
    // ?debug=1 surfaces the provider's reason — useful when a key is
    // rotated or a domain falls out of verification. Never includes the
    // API key, only Resend's own error text.
    const detail = req.query && req.query.debug === '1' ? String(err.message || err) : undefined;
    return res.status(502).json({
      ok: false,
      error: 'Could not send right now. Please email us directly.',
      ...(detail ? { detail } : {})
    });
  }

  // The client confirmation is nice-to-have. If it fails, the lead is
  // already captured, so report success rather than scaring the visitor.
  let autoReply = true;
  try {
    await sendViaResend(key, {
      from: FROM_EMAIL,
      to: [email],
      reply_to: TO_EMAIL,
      subject: 'We got your request — Covanreach Media',
      html: confirmEmail(d)
    });
  } catch (err) {
    console.error('Client confirmation failed:', err);
    autoReply = false;
  }

  return res.status(200).json({ ok: true, via: 'resend', autoReply });
}
