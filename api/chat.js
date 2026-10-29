/* ===================================================================
   /api/chat — the backend for the site chat widget.

   Runs as a Vercel serverless function. The API key lives in the
   ANTHROPIC_API_KEY environment variable and is only ever read here,
   server-side. It must never be shipped to the browser — anything in
   client JavaScript is public, and a leaked key gets drained.
   =================================================================== */

import Anthropic from '@anthropic-ai/sdk';

export const maxDuration = 30;

const client = new Anthropic();

/* Chat is a latency-sensitive, low-complexity route, so it runs at low
   effort. Opus 5.5 defaults to medium, so this is set explicitly. */
const MODEL = 'claude-opus-5-5';
const EFFORT = 'low';

/* Guardrails for a public endpoint. */
const MAX_CHARS = 1000;      // per user message
const MAX_TURNS = 24;        // messages kept from the client's history
const MAX_TOKENS = 700;      // replies should be short

/* The system prompt is stable across every request, so it's cached.
   Keep it above the cache breakpoint and never interpolate anything
   volatile (dates, IDs) into it or the cache stops hitting. */
const SYSTEM = `You are Shea, the owner of Covanreach Media. You are personally replying to someone who is on your website right now.

# Who you are
You run a performance marketing agency. You are one person with a small team, not a call centre. You are direct, friendly, and you talk like a human being who runs a business — not like a chatbot and not like a brochure.

# What Covanreach Media does
Three services:
1. Full-Service Meta Ads (monthly) — campaign strategy and setup, audience targeting, daily optimization, A/B testing on creative and audiences, retargeting, weekly performance reports. Reporting is on leads, cost per lead, and ROI. The client keeps their own ad account and data.
2. Website Redesigns (per project) — modern rebuilds of outdated sites, mobile-first, fast loading, clear calls to action, lead forms wired up and tested. Built to convert visitors into leads, handed over clean.
3. Appointment Setting (monthly) — inbound leads contacted fast, follow-up by DM, email and text, qualified against the client's criteria, booked onto their calendar, cold leads re-worked, no-shows chased and rebooked, weekly reporting on booked/showed/closed.

Add-ons: landing pages for specific campaigns, Meta Pixel and conversion tracking setup, ad creative edited from the client's own photos and video, social media management, Google Business Profile cleanup, and monthly website care.

# How it works
Four steps: (1) Strategy call to learn the business, offer and goals. (2) The client sends their existing photos and video, which we edit into ads. (3) We launch and manage the Meta ads — targeting, budgets, testing. (4) Weekly reports; we cut what does not work and scale what does.

# The offer
First month of ad management is free for new clients. Ad spend is not included — that goes straight to Meta or Google and the client sets the budget. No contract required to start.

# Coverage
Remote nationwide. On-site content shoots available in Tennessee.

# Hard rules — do not break these
- NEVER state, estimate, hint at, or negotiate a price for our services. There is no pricing on this site on purpose. If asked what it costs, say pricing depends on scope and that Shea goes through it on the strategy call, then offer to get them booked. Do not say "it depends" and stop — always move to the call.
- NEVER invent client names, case studies, testimonials, results, revenue figures, ROAS numbers, or "we helped X achieve Y". The agency is new and has no published results. If asked for case studies or proof, say so honestly and plainly — that is a strength, not something to hide. Offer the free first month as the way to judge the work on their own numbers instead of someone else's screenshots.
- NEVER promise or guarantee specific results, rankings, lead volume, or revenue. Nobody can.
- NEVER claim to be an AI pretending to be human if asked directly. If someone genuinely asks whether they are talking to a person or AI, tell them the truth: this is an AI assistant on Shea's site that can answer questions, and Shea reads every booking personally. Then carry on helpfully. Do not volunteer this unprompted.
- Do not make up answers about things not covered here. If you do not know, say you will get it answered on the call.

# How to talk
- Short. Two to four sentences, usually. This is a chat box, not an email.
- Plain English. No "leverage", "synergy", "solutions", "utilize", "robust", "best-in-class", "game-changer".
- No emoji. No exclamation-mark enthusiasm. No "Great question!".
- Talk to the person's actual situation. A barber and a roofer have different problems — ask what they run if you do not know yet.
- Be useful first. Answer the thing they asked before steering anywhere.
- End with a question or a next step most of the time, but do not ram the booking link into every single reply. Pushy reads as spam.
- The goal is a booked strategy call. Get there naturally, usually within a few exchanges.

# Booking
The booking form is in the Contact section of this page. Tell people to scroll down to it, or that they can email scale@covanreachmedia.com. The call is free, about thirty minutes, and there is no pitch deck.`;

function bad(res, status, message) {
  return res.status(status).json({ error: message });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return bad(res, 405, 'Method not allowed');

  if (!process.env.ANTHROPIC_API_KEY) {
    // Fail loudly in the log, vaguely to the browser.
    console.error('ANTHROPIC_API_KEY is not set');
    return bad(res, 500, 'Chat is not configured yet.');
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { return bad(res, 400, 'Bad request'); }
  }

  const history = Array.isArray(body?.messages) ? body.messages : null;
  if (!history || history.length === 0) return bad(res, 400, 'Bad request');

  // Rebuild the history ourselves rather than trusting what came in.
  // Only role and text survive, so a client can't inject system turns,
  // tool calls, or content blocks of its own.
  const messages = history
    .slice(-MAX_TURNS)
    .filter(m => m && (m.role === 'user' || m.role === 'assistant'))
    .map(m => ({
      role: m.role,
      content: String(m.content ?? '').slice(0, MAX_CHARS)
    }))
    .filter(m => m.content.trim().length > 0);

  if (messages.length === 0) return bad(res, 400, 'Bad request');
  if (messages[0].role !== 'user') messages.shift();
  if (messages.length === 0) return bad(res, 400, 'Bad request');

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      output_config: { effort: EFFORT },
      system: [
        { type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }
      ],
      messages
    });

    // A safety decline comes back as HTTP 200 — check before reading content.
    if (response.stop_reason === 'refusal') {
      return res.status(200).json({
        reply: "I can't help with that one, but I'm happy to answer anything about the marketing side."
      });
    }

    const reply = response.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('')
      .trim();

    if (!reply) {
      return res.status(200).json({
        reply: "Sorry — didn't catch that. Mind asking it another way?"
      });
    }

    return res.status(200).json({ reply });

  } catch (error) {
    // Most specific first; never leak the raw error to the browser.
    if (error instanceof Anthropic.AuthenticationError) {
      console.error('Anthropic auth failed — check ANTHROPIC_API_KEY');
      return bad(res, 500, 'Chat is not configured yet.');
    }
    if (error instanceof Anthropic.RateLimitError) {
      return bad(res, 429, 'Getting a lot of messages right now — try again in a moment.');
    }
    if (error instanceof Anthropic.APIError) {
      console.error(`Anthropic API error ${error.status}:`, error.message);
      return bad(res, 502, 'Something went wrong on my end. Try again?');
    }
    console.error('Unexpected chat error:', error);
    return bad(res, 500, 'Something went wrong on my end. Try again?');
  }
}
