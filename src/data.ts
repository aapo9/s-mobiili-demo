/**
 * Demo data. In the real product this comes from S-Bank transaction history
 * and S-Group item-level purchase data (S-Etukortti). The "AI" here is a fixed
 * set of pre-computed suggestions plus a small optimiser in state.tsx.
 */

export const PAYDAY = '28.11.';
export const ACCOUNT_BALANCE = 612.4;

export type PlanItem = {
  id: string;
  title: string;
  sub: string;
  amount: number;
  /** Suggestion that targets this purchase, if any. */
  suggestionId?: string;
  /** User already protected this purchase in an earlier session. */
  protectedByUser?: boolean;
  fixed?: boolean;
};

/** Forecast of spending between today (14.11.) and payday, built from history. */
export const PLAN: PlanItem[] = [
  { id: 'p-wolt-sat', title: 'Wolt-tilaus', sub: 'La 22.11. · arvio', amount: 24.9, suggestionId: 's-wolt' },
  { id: 'p-hbo', title: 'HBO Max', sub: 'Veloitus 20.11.', amount: 9.99, suggestionId: 's-hbo' },
  { id: 'p-cheese', title: 'Valio Oltermanni 900 g', sub: 'Yleensä 2 kertaa · S-market', amount: 22.98, suggestionId: 's-cheese' },
  { id: 'p-battery', title: 'Battery-energiajuoma 0,5 l', sub: 'Yleensä 10 kpl · S-market, ABC', amount: 26.9, suggestionId: 's-battery' },
  { id: 'p-wolt-fri', title: 'Wolt-tilaus', sub: 'Pe 21.11. · arvio', amount: 26.4, protectedByUser: true },
  { id: 'p-groceries', title: 'Muut ruokaostokset', sub: '4 kauppakäyntiä · arvio', amount: 186.4 },
  { id: 'p-power', title: 'Helen sähkö', sub: 'Eräpäivä 24.11.', amount: 38.5, fixed: true },
  { id: 'p-phone', title: 'Elisa puhelinlasku', sub: 'Eräpäivä 25.11.', amount: 19.9, fixed: true },
  { id: 'p-ins', title: 'If kotivakuutus', sub: 'Eräpäivä 27.11.', amount: 34.2, fixed: true },
  { id: 'p-gym', title: 'Kuntosali', sub: 'Veloitus 20.11.', amount: 29.9, fixed: true },
  { id: 'p-other', title: 'Muut menot', sub: 'Liikenne, kahvilat ym. · arvio', amount: 128.17 },
];

export const PLAN_TOTAL = PLAN.reduce((s, p) => s + p.amount, 0);
/** Money left on payday if nothing changes. */
export const BASELINE = ACCOUNT_BALANCE - PLAN_TOTAL;

export type QA = { q: string; a: string };

type Base = {
  id: string;
  planItemId: string;
  title: string;
  /** Short reason, shown on the card. Grounded in the user's own history. */
  reason: string;
  /** Used to decide whether it lands on the shopping list. */
  area: 'grocery' | 'delivery' | 'subscription';
  qa: QA[];
};

export type RemoveSuggestion = Base & {
  kind: 'remove';
  lead: string;
  saving: number;
  doneLabel: string;
};

export type PauseSuggestion = Base & {
  kind: 'pause';
  lead: string;
  saving: number;
  monthly: number;
  nextCharge: string;
  steps: string[];
  doneLabel: string;
};

export type SwapSuggestion = Base & {
  kind: 'swap';
  from: { name: string; price: number };
  to: { name: string; price: number };
  times: number;
  lead: string;
  doneLabel: string;
};

export type ReduceSuggestion = Base & {
  kind: 'reduce';
  product: string;
  unitPrice: number;
  current: number;
  suggested: number;
  lead: string;
};

export type Suggestion = RemoveSuggestion | PauseSuggestion | SwapSuggestion | ReduceSuggestion;

export const SUGGESTIONS: Suggestion[] = [
  {
    id: 's-wolt',
    kind: 'remove',
    planItemId: 'p-wolt-sat',
    area: 'delivery',
    title: 'Ruokatilaus lauantaina',
    reason: 'Tilaat Woltista yleensä perjantaina ja lauantaina.',
    lead: 'Jätä lauantai pois ja säästä',
    saving: 24.9,
    doneLabel: 'Lauantain Wolt pois',
    qa: [
      {
        q: 'Miksi juuri lauantai?',
        a: 'Lauantain tilaus on lokakuun tapahtumiesi perusteella keskimäärin 24,90 €, ja perjantain tilauksen pidät jo tärkeänä. Lauantai on siksi helpoin säästö.',
      },
      {
        q: 'Mitä syön sen sijaan?',
        a: 'Kotona tehty pizza maksaa noin 6 €. Se sisältyy jo ruokaostostesi arvioon, joten säästö pysyy samana.',
      },
      {
        q: 'Voinko perua tämän myöhemmin?',
        a: 'Voit. Säästö on vain suunnitelma, eikä se estä tilaamista. Voit perua sen Säästä-välilehdeltä milloin vain.',
      },
    ],
  },
  {
    id: 's-hbo',
    kind: 'pause',
    planItemId: 'p-hbo',
    area: 'subscription',
    title: 'HBO Max tauolle',
    reason: 'Maksat kolmesta suoratoistopalvelusta. HBO Maxia et ole avannut lokakuun jälkeen.',
    lead: 'Pidä tauko ja säästä',
    saving: 9.99,
    monthly: 9.99,
    nextCharge: '20.11.',
    steps: [
      'Avaa HBO Max -sovellus tai sen verkkosivu.',
      'Mene tilisi asetuksiin ja valitse tilauksen peruminen.',
      'Peru ennen 20.11., niin seuraavaa maksua ei tule.',
    ],
    doneLabel: 'HBO Max tauolle',
    qa: [
      {
        q: 'Voinko jatkaa tilausta myöhemmin?',
        a: 'Voit. Peruminen ei poista tunnustasi, joten voit tilata uudelleen milloin vain.',
      },
      {
        q: 'Miksi ehdotit juuri tätä?',
        a: 'Maksat kolmesta suoratoistopalvelusta, yhteensä 38,97 € kuussa. Yhden tauko nostaa jokaista palkkapäivääsi noin 10 €. Voit valita itse, minkä pidät.',
      },
      {
        q: 'Mitä jos en peru?',
        a: 'Silloin 9,99 € veloitetaan 20.11. ja palkkapäivän arvio laskee takaisin. Muistutamme sinua 18.11.',
      },
    ],
  },
  {
    id: 's-cheese',
    kind: 'swap',
    planItemId: 'p-cheese',
    area: 'grocery',
    title: 'Halvempi juusto',
    reason: 'Ostat tätä noin 2 kertaa ennen palkkaa.',
    from: { name: 'Valio Oltermanni 900 g', price: 11.49 },
    to: { name: 'Kotimaista juusto 900 g', price: 7.99 },
    times: 2,
    lead: 'Säästät',
    doneLabel: 'Kotimaista juusto',
    qa: [
      {
        q: 'Onko maku samanlainen?',
        a: 'Molemmat ovat mietoja, 17 % rasvaa sisältäviä viipalejuustoja. Kotimaista juusto saa S-kaupoissa arvion 4,3 / 5.',
      },
      {
        q: 'Mistä tiedät mitä ostan?',
        a: 'S-Etukortin ostotiedoistasi. Näet ne myös S-Etukortti-välilehdellä. Voit kieltää niiden käytön asetuksista.',
      },
    ],
  },
  {
    id: 's-battery',
    kind: 'reduce',
    planItemId: 'p-battery',
    area: 'grocery',
    title: 'Vähemmän energiajuomia',
    reason: 'Ostat noin 10 tölkkiä ennen palkkapäivää, yleensä arkiaamuisin.',
    product: 'Battery 0,5 l',
    unitPrice: 2.69,
    current: 10,
    suggested: 4,
    lead: 'Säästät',
    qa: [
      {
        q: 'Miksi 4 tölkkiä?',
        a: 'Neljä tölkkiä riittää kahdeksi aamuksi viikossa. Voit valita itse määrän, ja säästö päivittyy heti.',
      },
      {
        q: 'Lasketaanko pantti mukaan?',
        a: 'Kyllä. Hinta 2,69 € sisältää 0,15 € pantin.',
      },
    ],
  },
];

export const byId = (id: string) => SUGGESTIONS.find((s) => s.id === id)!;
export const planItem = (id: string) => PLAN.find((p) => p.id === id)!;

/** Default saving for a suggestion, before the user adjusts anything. */
export function defaultSaving(s: Suggestion): number {
  switch (s.kind) {
    case 'remove':
    case 'pause':
      return s.saving;
    case 'swap':
      return (s.from.price - s.to.price) * s.times;
    case 'reduce':
      return (s.current - s.suggested) * s.unitPrice;
  }
}

export const MAX_SAVING = SUGGESTIONS.reduce((sum, s) => sum + defaultSaving(s), 0);

/** Completed transactions: these never change. */
export const TRANSACTIONS = [
  { id: 't1', date: '13.11.', title: 'Wolt', sub: 'Korttiosto', amount: -26.4 },
  { id: 't2', date: '13.11.', title: 'S-market Kallio', sub: 'Korttiosto', amount: -31.84 },
  { id: 't3', date: '12.11.', title: 'HSL', sub: 'Korttiosto', amount: -3.2 },
  { id: 't4', date: '11.11.', title: 'ABC Kamppi', sub: 'Korttiosto', amount: -8.07 },
  { id: 't5', date: '10.11.', title: 'Prisma Itäkeskus', sub: 'Korttiosto', amount: -54.12 },
  { id: 't6', date: '08.11.', title: 'Wolt', sub: 'Korttiosto', amount: -23.6 },
  { id: 't7', date: '07.11.', title: 'Wolt', sub: 'Korttiosto', amount: -27.1 },
  { id: 't8', date: '05.11.', title: 'Netflix', sub: 'Korttiosto', amount: -13.99 },
  { id: 't9', date: '05.11.', title: 'Spotify', sub: 'Korttiosto', amount: -14.99 },
  { id: 't10', date: '03.11.', title: 'Vuokra · Kiinteistö Oy Vaasankatu', sub: 'E-lasku', amount: -720 },
  { id: 't11', date: '31.10.', title: 'Palkka', sub: 'Tilisiirto', amount: 2140.0 },
];

/** Next shopping trip. Items tied to a suggestion change when it is accepted. */
export const SHOPPING_BASE = [
  { id: 'l-milk', name: 'Valio rasvaton maito 1 l', qty: 2, price: 1.29 },
  { id: 'l-rye', name: 'Fazer Ruispalat 6 kpl', qty: 1, price: 2.15 },
  { id: 'l-banana', name: 'Banaani', qty: 1, price: 1.49, unit: 'n. 1 kg' },
  { id: 'l-eggs', name: 'Kotimaista kananmunat 10 kpl', qty: 1, price: 2.45 },
  { id: 'l-pasta', name: 'Kotimaista spagetti 1 kg', qty: 1, price: 1.39 },
];
