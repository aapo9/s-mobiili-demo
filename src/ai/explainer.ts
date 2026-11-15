/**
 * "Kerro lisää": the explanation card and the chat under it.
 *
 * Screens only talk to `explainer` (suggestion cards) and `transferAdvisor`
 * ("Siirrä säästöön").
 *
 * - The explanation card and the tap-only question chips use the hand-written
 *   texts in placeholder.ts. They are instant and always right.
 * - Anything else the user types goes to Gemini with a compact, plain-text
 *   context: the scenario, the suggestion's `facts` (data.ts), the explanation
 *   already on screen and the ready Q&A. The model is told to answer only from
 *   that, so even a cheap "flash-lite" model gives grounded answers.
 *
 * The prompt is built here, but the model is called by the server route
 * `src/app/api/chat+api.ts`, which holds the key (GEMINI_API_KEY, server-only).
 * The app never sees the key. Without a key on the server, free-text questions
 * get a polite "not enabled" reply.
 */
import type { ChatResult } from '../app/api/chat+api';
import type { Demo, Suggestion } from '../data';
import type { Lang } from '../i18n/lang';
import { eur } from '../theme';
import { explanationFor, transferAnswers, transferExplanation } from './placeholder';

export type Explanation = {
  /** Why this was suggested, from the user's own data. */
  why: string;
  /** What the saving means in money over time. */
  impact: string;
  /** One money concept the user can reuse elsewhere. */
  lesson: { term: string; body: string };
  /** Where the bank got the data from. Shown as a small footnote. */
  source: string;
};

export type ExplainContext = {
  /** The active demo set: payday, forecast, transactions. */
  demo: Demo;
  /** Saving with the user's current choice (e.g. stepper quantity). */
  saving: number;
  /** For reduce suggestions: chosen quantity. */
  qty?: number;
};

/** One earlier question and its answer, oldest first. */
export type ChatTurn = { q: string; a: string };

export interface Explainer {
  explain(s: Suggestion, ctx: ExplainContext): Promise<Explanation>;
  /** Answers a suggested question or any free-text one. `history` is the chat so far. */
  answer(s: Suggestion, question: string, ctx: ExplainContext, history: ChatTurn[]): Promise<string>;
}

/** Numbers behind the "Siirrä säästöön" suggestion. */
export type TransferContext = {
  /** Suggested transfer, whole euros. */
  amount: number;
  /** Savings the user accepted this pay period. */
  saved: number;
  /** Estimated S-Tili balance on payday without the transfer. */
  paydayBefore: number;
  /** Estimated S-Tili balance on payday after the transfer. */
  paydayAfter: number;
  /** Left on S-Tili on payday after the transfer if only half of the accepted savings happen. */
  ifHalfFails: number;
  /** Minimum always left on S-Tili on payday. */
  buffer: number;
  savingsBalance: number;
  /** The active demo set. */
  demo: Demo;
};

/** "Siirrä säästöön": the explanation, suggested questions, and answers to any question. */
export interface TransferAdvisor {
  explain(ctx: TransferContext): Promise<Explanation>;
  /** Suggested follow-up questions, shown as tap-only chips. */
  questions(ctx: TransferContext): string[];
  answer(question: string, ctx: TransferContext, history: ChatTurn[]): Promise<string>;
}

// ---------------------------------------------------------------------------
// Prompt
// ---------------------------------------------------------------------------

const RULES = (lang: Lang, topic: string) =>
  [
    `You are the savings assistant in S-mobiili, S-Bank's mobile banking app. ${topic}`,
    '',
    'Rules:',
    `- Always answer in ${lang === 'fi' ? 'Finnish' : 'English'}, in plain, friendly language. Address the customer as "you".`,
    '- Answer in 1-3 short sentences of plain text. No markdown, no bullet points, no greetings.',
    '- Use ONLY the facts below. Never invent prices, dates, amounts, product details or terms.',
    '- If the facts do not answer the question, say briefly that you do not have that information, and say where the customer could check it (for example the service’s own app, or S-Bank customer service).',
    '- If a ready answer below covers the question, give the same answer in your own words.',
    '- For "what if" questions, you may do simple arithmetic with the numbers below (add, subtract, multiply). Give the result in euros.',
    '- The bank only sees account transactions and S-Etukortti item-level purchases. Never claim to know how often a service is used, what the customer likes, or anything outside that data.',
    '- Never judge or preach. The decision is always the customer’s.',
    '- Do not promise returns, and do not give investment, health or legal advice.',
    '- If the question has nothing to do with money, this suggestion or this app, kindly say you can only help with this suggestion and the customer’s spending.',
  ].join('\n');

const APP_FACTS: Record<Lang, string[]> = {
  fi: [
    'Ehdotukset ovat vain suunnitelma. Ne eivät estä ostamista, eivätkä toteutuneet tilitapahtumat muutu.',
    'Hyväksy: säästö lisätään palkkapäivän arvioon. Hylkää: ostos merkitään tärkeäksi (lukko), eikä sitä ehdoteta enää.',
    'Hyväksytyn säästön voi perua Säästä-välilehdellä (Peru tämä säästö). Peruttua säästöä ei ehdoteta uudelleen.',
    'Ennuste ja palkkapäivän saldo ovat arvioita, jotka perustuvat aiempiin ostoksiin.',
    'Pankki näkee vain tilitapahtumat ja S-Etukortin ostotiedot. S-Etukortin ostotietojen käytön voi kieltää asetuksista.',
    'Kun kaikki ehdotukset on käyty läpi, S-mobiili voi ehdottaa osan säästöstä siirtämistä säästötilille.',
  ],
  en: [
    'Suggestions are only a plan. They don’t stop any purchase, and completed transactions never change.',
    'Accept: the saving is added to the payday estimate. Decline: the purchase is marked important (lock) and is not suggested again.',
    'An accepted saving can be cancelled on the Save tab (Cancel this saving). A cancelled saving is not suggested again.',
    'The forecast and the payday balance are estimates based on past purchases.',
    'The bank only sees account transactions and S-Etukortti purchase data. The use of S-Etukortti data can be turned off in settings.',
    'Once all suggestions are reviewed, S-mobiili may suggest moving part of the saving to the savings account.',
  ],
};

const TRANSFER_FACTS: Record<Lang, string[]> = {
  fi: [
    'Siirto tehdään S-Tililtä asiakkaan omalle säästötilille. Siirto omien tilien välillä on maksuton ja näkyy heti.',
    'Rahat voi siirtää säästötililtä takaisin S-Tilille S-mobiilissa milloin vain.',
    'Ehdotettu summa on tarkoituksella pienempi kuin hyväksytyt säästöt, jotta osa jää varaksi käyttötilille.',
    'Summan voi valita itse kohdasta Siirrä eri määrä, 5 € askelin. Ylärajana on summa, joka jättää vähintään puskurin S-Tilille palkkapäivänä.',
    'Ei nyt piilottaa ehdotuksen.',
    'Säästötilin korkoa ei kerrota tässä. Älä lupaa tuottoa.',
  ],
  en: [
    'The transfer goes from S-Tili to the customer’s own savings account. Transfers between your own accounts are free and show up right away.',
    'The money can be moved back from the savings account to S-Tili in S-mobiili at any time.',
    'The suggested amount is deliberately smaller than the accepted savings, so part stays on the spending account as a reserve.',
    'The customer can pick the amount with Move a different amount, in €5 steps. The maximum is what still leaves the buffer on S-Tili on payday.',
    'Not now hides the suggestion.',
    'The savings account interest rate is not given here. Do not promise returns.',
  ],
};

const list = (items: string[]) => items.map((x) => `- ${x}`).join('\n');
const money = (n: number) => eur(Number(n.toFixed(2)));

/** The scenario: balances, forecast and recent transactions, as short lines. */
function situation(demo: Demo): string {
  const plan = demo.plan.map((p) => {
    const tags = [p.fixed ? 'fixed bill' : '', p.protectedByUser ? 'marked important by the customer' : '', p.suggestionId ? 'has a savings suggestion' : '']
      .filter(Boolean)
      .join(', ');
    return `${p.title} (${p.sub}): ${money(p.amount)}${tags ? ` [${tags}]` : ''}`;
  });
  const tx = demo.transactions.map((t) => `${t.date} ${t.title} (${t.sub}): ${money(t.amount)}`);
  const sugg = demo.suggestions.map((s) => `${s.title}: ${s.reason}`);
  return [
    '# Situation',
    `Today: ${demo.today}. Next payday: ${demo.payday}.`,
    `S-Tili (spending account) balance now: ${money(demo.balance)}.`,
    `Estimated spending until payday: ${money(demo.planTotal)}.`,
    `Estimated S-Tili balance on payday without any changes: ${money(demo.baseline)}.`,
    `Savings account (${demo.savingsAccount.name}): ${money(demo.savingsAccount.balance)}.`,
    '',
    '# Estimated spending until payday',
    list(plan),
    '',
    '# Recent completed transactions (newest first)',
    list(tx),
    '',
    '# All savings suggestions this pay period',
    list(sugg),
  ].join('\n');
}

const readyAnswers = (qa: { q: string; a: string }[]) => qa.map((x) => `Q: ${x.q}\nA: ${x.a}`).join('\n\n');

const shown = (e: Explanation) =>
  [`Why: ${e.why}`, `What it means: ${e.impact}`, `Good to know: ${e.lesson.term}. ${e.lesson.body}`, `Data: ${e.source}`].join('\n');

/** Everything the model needs to answer questions about one suggestion. */
export function suggestionPrompt(s: Suggestion, ctx: ExplainContext): string {
  const { demo } = ctx;
  const choice =
    s.kind === 'reduce'
      ? `Current choice: ${ctx.qty ?? s.suggested} ${s.unit} instead of ${s.current} ${s.unit} (${s.product}, ${money(s.unitPrice)} each).`
      : s.kind === 'swap'
        ? `Swap: ${s.from.name} ${money(s.from.price)} → ${s.to.name} ${money(s.to.price)}, ${s.times} time(s) before payday.`
        : null;
  return [
    RULES(demo.lang, `The customer is looking at one savings suggestion, "${s.title}", and asks questions about it.`),
    '',
    situation(demo),
    '',
    `# The suggestion: ${s.title}`,
    `Shown on the card: ${s.reason}`,
    choice,
    `Saving with the customer’s current choice: ${money(ctx.saving)} before payday ${demo.payday}.`,
    `Estimated payday balance if only this is accepted: ${money(demo.baseline + ctx.saving)}.`,
    s.steps?.length ? `How to do it: ${s.steps.join(' ')}` : null,
    '',
    '# Facts about this suggestion',
    list(s.facts),
    '',
    '# Explanation already shown to the customer',
    shown(explanationFor(s, ctx)),
    '',
    '# Ready answers',
    readyAnswers(s.qa),
    '',
    '# How the app works',
    list(APP_FACTS[demo.lang]),
  ]
    .filter((line) => line !== null)
    .join('\n');
}

/** Everything the model needs to answer questions about the "Siirrä säästöön" suggestion. */
export function transferPrompt(ctx: TransferContext): string {
  const { demo } = ctx;
  const answers = transferAnswers(ctx);
  return [
    RULES(
      demo.lang,
      `The customer has just accepted savings, and the app suggests moving ${money(ctx.amount)} of it from S-Tili to the savings account now. The customer asks questions about that transfer.`,
    ),
    '',
    situation(demo),
    '',
    '# The transfer suggestion',
    `Suggested transfer now: ${money(ctx.amount)} from S-Tili to ${demo.savingsAccount.name} (${demo.savingsAccount.iban}).`,
    `Savings the customer accepted this pay period: ${money(ctx.saved)}.`,
    `Estimated S-Tili balance on payday ${demo.payday} without the transfer: ${money(ctx.paydayBefore)}.`,
    `Estimated S-Tili balance on payday after the transfer: ${money(ctx.paydayAfter)}.`,
    `Left on S-Tili on payday after the transfer even if half of the accepted savings don’t happen: ${money(ctx.ifHalfFails)}.`,
    `Minimum buffer always left on S-Tili on payday: ${money(ctx.buffer)}.`,
    `Savings account balance: ${money(ctx.savingsBalance)} now, ${money(ctx.savingsBalance + ctx.amount)} after the transfer.`,
    '',
    '# Facts about the transfer',
    list(TRANSFER_FACTS[demo.lang]),
    '',
    '# Explanation already shown to the customer',
    shown(transferExplanation(ctx)),
    '',
    '# Ready answers',
    readyAnswers(Object.entries(answers).map(([q, a]) => ({ q, a }))),
    '',
    '# How the app works',
    list(APP_FACTS[demo.lang]),
  ].join('\n');
}

// ---------------------------------------------------------------------------
// Model call
// ---------------------------------------------------------------------------

/** Why the model gave no answer: no key on the server, credits/quota used up, or no (valid) response at all. */
type AiFailure = 'disabled' | 'credits' | 'down';

/** Turns the server keeps at most (the oldest are dropped first). */
const MAX_TURNS = 12;

/**
 * Asks the model through our own server route, which holds the key. On web the
 * relative URL is the page's own server; on native, Expo Router resolves it to
 * the dev server in development and to the `origin` in app.json in production.
 */
async function chat(system: string, history: ChatTurn[], question: string): Promise<string | AiFailure> {
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), 25000);
  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      signal: abort.signal,
      body: JSON.stringify({ system, history: history.slice(-MAX_TURNS), question }),
    });
    const result = (await res.json()) as ChatResult;
    if ('text' in result) return result.text;
    console.warn(`/api/chat: ${res.status} ${result.error}`);
    return result.error === 'disabled' || result.error === 'credits' ? result.error : 'down';
  } catch (e) {
    // Timeouts, network errors and non-JSON responses all count as "didn't respond".
    console.warn(e);
    return 'down';
  } finally {
    clearTimeout(timer);
  }
}

const NOT_ENABLED: Record<Lang, string> = {
  fi: 'Osaan vastata omin sanoin kirjoitettuihin kysymyksiin, kun keskusteluavustaja on käytössä. Kokeile sillä välin valmiita kysymyksiä.',
  en: 'I can answer questions in your own words once the chat assistant is enabled. Meanwhile, try the suggested questions.',
};

/** Said straight: this is a demo, and its AI runs on prepaid API credits. */
const FAILED: Record<Exclude<AiFailure, 'disabled'>, Record<Lang, string>> = {
  credits: {
    fi: 'Tämän demon tekoälyn API-krediitit ovat loppuneet, joten en pysty nyt vastaamaan omin sanoin kirjoitettuihin kysymyksiin. Valmiit kysymykset toimivat yhä.',
    en: 'This demo’s AI API credits have run out, so I can’t answer questions in your own words right now. The suggested questions still work.',
  },
  down: {
    fi: 'Tekoälypalvelu ei vastannut. Todennäköisesti tämän demon API-krediitit ovat loppuneet, joten en pysty nyt vastaamaan omin sanoin kirjoitettuihin kysymyksiin. Valmiit kysymykset toimivat yhä.',
    en: 'The AI service didn’t respond. Most likely this demo’s API credits have run out, so I can’t answer questions in your own words right now. The suggested questions still work.',
  },
};

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const norm = (q: string) => q.trim().toLowerCase().replace(/[?!.\s]+$/, '');

/** A ready answer when the question matches a chip; otherwise the model. */
async function reply(lang: Lang, ready: Record<string, string>, question: string, history: ChatTurn[], prompt: () => string) {
  const hit = Object.keys(ready).find((q) => norm(q) === norm(question));
  if (hit) {
    await wait(650);
    return ready[hit];
  }
  const answer = await chat(prompt(), history, question);
  if (answer === 'disabled') return NOT_ENABLED[lang];
  if (answer === 'credits' || answer === 'down') return FAILED[answer][lang];
  return answer;
}

export const explainer: Explainer = {
  async explain(s, ctx) {
    await wait(900);
    return explanationFor(s, ctx);
  },
  answer(s, question, ctx, history) {
    const ready = Object.fromEntries(s.qa.map((x) => [x.q, x.a]));
    return reply(ctx.demo.lang, ready, question, history, () => suggestionPrompt(s, ctx));
  },
};

export const transferAdvisor: TransferAdvisor = {
  async explain(ctx) {
    await wait(900);
    return transferExplanation(ctx);
  },
  questions: (ctx) => Object.keys(transferAnswers(ctx)),
  answer(question, ctx, history) {
    return reply(ctx.demo.lang, transferAnswers(ctx), question, history, () => transferPrompt(ctx));
  },
};
