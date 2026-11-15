/**
 * POST /api/chat: the server side of the "Kerro lisää" chat.
 *
 * The app sends the prompt it built (src/ai/explainer.ts), the chat so far and
 * the new question. This route adds the Gemini key and calls the model, so the
 * key never reaches a browser or a phone. It runs on EAS Hosting in production
 * and on the dev server (`npx expo start`) locally.
 *
 * The key comes from the server-only env var GEMINI_API_KEY: `.env.local` when
 * developing, the EAS "production" environment when deployed
 * (`eas deploy --environment production`). Never prefix it with EXPO_PUBLIC_.
 *
 * Abuse limits: a fixed model and output cap, size caps on everything the
 * client sends, and browsers from other websites are turned away. Anyone can
 * still call this route directly, but only as a small, capped chat, never with
 * the key itself. Keep a quota on the key as the hard cost limit.
 */

type Turn = { q: string; a: string };
type Body = { system?: unknown; history?: unknown; question?: unknown };
export type ChatResult = { text: string } | { error: 'disabled' | 'credits' | 'down' | 'bad-request' };

const MODEL = process.env.GEMINI_MODEL || 'gemini-flash-lite-latest';
const LIMITS = { system: 24000, question: 600, turns: 12, turnText: 6000 };

/** Pages allowed to call this from a browser (checked when the header reaches us). Native apps send none. */
const ALLOWED_ORIGIN = /^(https:\/\/s-mobiili-demo(--[a-z0-9]+)?\.expo\.app|http:\/\/(localhost|127\.0\.0\.1)(:\d+)?)$/;

const json = (body: ChatResult, status = 200) => Response.json(body, { status });

const isText = (v: unknown, max: number): v is string => typeof v === 'string' && v.trim().length > 0 && v.length <= max;

/**
 * Turns away browsers on other websites. EAS Hosting answers CORS preflights
 * itself (allowing only this site) but doesn't pass `Origin` on to us, so:
 * - JSON only: a cross-site page can't send that without a preflight, which fails.
 * - `Sec-Fetch-Site` (set by browsers, not forgeable from a page) must be ours.
 * - `Origin`, when it does arrive (local dev server), must be ours.
 */
function fromOtherSite(request: Request): boolean {
  const type = request.headers.get('content-type') ?? '';
  if (!type.toLowerCase().startsWith('application/json')) return true;
  const site = request.headers.get('sec-fetch-site');
  if (site && site !== 'same-origin' && site !== 'none') return true;
  const origin = request.headers.get('origin');
  return Boolean(origin && !ALLOWED_ORIGIN.test(origin));
}

export async function POST(request: Request) {
  if (fromOtherSite(request)) return json({ error: 'bad-request' }, 403);

  const key = process.env.GEMINI_API_KEY;
  if (!key) return json({ error: 'disabled' });

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return json({ error: 'bad-request' }, 400);
  }
  const { system, question } = body;
  const history = Array.isArray(body.history) ? (body.history as Turn[]) : [];
  if (
    !isText(system, LIMITS.system) ||
    !isText(question, LIMITS.question) ||
    history.length > LIMITS.turns ||
    !history.every((t) => t && isText(t.q, LIMITS.turnText) && isText(t.a, LIMITS.turnText))
  ) {
    return json({ error: 'bad-request' }, 400);
  }

  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), 20000);
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
      signal: abort.signal,
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [
          ...history.flatMap((t) => [
            { role: 'user', parts: [{ text: t.q }] },
            { role: 'model', parts: [{ text: t.a }] },
          ]),
          { role: 'user', parts: [{ text: question }] },
        ],
        generationConfig: { temperature: 0.2, maxOutputTokens: 1024 },
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.warn(`Gemini ${res.status}: ${text.slice(0, 500)}`);
      // 429 RESOURCE_EXHAUSTED is Gemini's "quota / credits used up".
      return json({ error: res.status === 429 || /RESOURCE_EXHAUSTED|quota|billing/i.test(text) ? 'credits' : 'down' });
    }
    const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] } }[] };
    const text = (data.candidates?.[0]?.content?.parts ?? [])
      .filter((p) => !p.thought)
      .map((p) => p.text ?? '')
      .join('')
      .replace(/\*\*?/g, '')
      .trim();
    return text ? json({ text }) : json({ error: 'down' });
  } catch (e) {
    console.warn(e);
    return json({ error: 'down' });
  } finally {
    clearTimeout(timer);
  }
}
