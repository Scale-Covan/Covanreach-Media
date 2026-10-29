# Turning the chat widget on

The widget is built and deployed, but it won't answer anything until it
has an API key. Until then it shows a friendly "something went wrong,
email me instead" message rather than breaking.

Three steps, about ten minutes.

---

## 1. Get an Anthropic API key

1. Go to [console.anthropic.com](https://console.anthropic.com) and sign up.
2. **Billing → add a payment method**, and set a monthly spend limit.
   Start at **$20**. This is a public endpoint on the internet; a hard cap
   is what stops a surprise bill.
3. **API Keys → Create Key**. Copy it — it's shown once.

---

## 2. Add the key to Vercel

1. Vercel dashboard → your project → **Settings → Environment Variables**
2. Add:

   | Name | Value |
   |---|---|
   | `ANTHROPIC_API_KEY` | the key you just copied |

3. Apply it to **Production, Preview, and Development**.
4. **Redeploy** — environment variables only take effect on a new build.

**Never put the key in `app.js`, `chat.js`, or any file in this repo.**
Anything in the browser is public. The key is only ever read inside
`api/chat.js`, which runs on Vercel's server, not in the visitor's browser.

---

## 3. Test it

Open the live site, click **Ask Shea**, and send a message.

Good first tests:
- "what do you charge?" — should decline to quote and steer to the call
- "show me a case study" — should admit there aren't any yet, honestly
- "am I talking to a real person?" — should tell the truth

---

## What it costs

Runs on `claude-opus-5-5` at low effort, replies capped at 700 tokens,
with the system prompt cached so repeat conversations are cheaper.

A typical exchange is a fraction of a cent. A hundred real conversations
a month is still small money. The spend limit in step 1 is the real
protection.

**Want it cheaper?** In `api/chat.js`, change:

```js
const MODEL = 'claude-opus-5-5';
```

to:

```js
const MODEL = 'claude-haiku-5-5';
```

Haiku is roughly 40x cheaper per token. It's a noticeable step down in
conversational judgement, but for answering "do you do websites too?"
it's more than enough. Opus is the better salesperson; Haiku is the
cheaper one. Your call.

---

## Changing what it says

Everything the assistant knows is the `SYSTEM` string at the top of
`api/chat.js`. Edit it in plain English and redeploy.

The hard rules in there are deliberate — it will not quote prices, will
not invent case studies or results, and will not promise outcomes. Those
exist because a chatbot inventing a price or a fake client result is
worse than no chatbot. Keep them.

To change the three starter questions, edit `CHIPS` in `chat.js`.

---

## Why it doesn't pop up on its own

It never auto-opens, has no unread badge, and doesn't bounce. That's
deliberate — those are the patterns that make a chat widget feel like
spam. A visitor who wants it clicks it.

If you ever want a gentle one-time nudge after someone scrolls the
pricing or contact area, that's easy to add — just ask.

---

## One gap worth knowing

There's no rate limiting. Serverless functions don't hold memory between
requests, so a simple per-IP counter doesn't reliably work.

In practice the spend limit covers you. If the site gets real traffic and
you want proper protection, Vercel's **Firewall → Bot Protection** (free
tier) is the easiest next step, and a Vercel KV-backed rate limit after
that.
