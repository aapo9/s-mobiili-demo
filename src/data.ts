/**
 * Demo data. In the real product this comes from S-Bank transaction history
 * and S-Group item-level purchase data (S-Etukortti). The "AI" here is a fixed
 * set of pre-computed suggestions plus a small optimiser in state.tsx.
 *
 * There are several demo sets (`demoSets(lang)`). The presenter picks one on the
 * Minä tab; `useSave().demo` is the active one. Screens never import a set
 * directly.
 *
 * Every set is built per language: each text is written as `L('suomeksi',
 * 'in English')` next to its numbers, so both languages always share the same
 * amounts. Ids are the same in both languages, so decisions survive a switch.
 */
import type { ImageSourcePropType } from 'react-native';
import type { Lang } from './i18n/lang';

/** Always left on S-Tili on payday after a transfer, because the forecast is only an estimate. */
export const TRANSFER_BUFFER = 50;
/** Smaller transfers aren't worth suggesting. */
export const TRANSFER_MIN = 10;
/** Share of the accepted savings to suggest moving; the rest stays on S-Tili as extra margin. */
export const TRANSFER_SHARE = 0.75;
/** Suggested amounts are rounded down to this, so they read as a deliberate, round sum (58 € saved → 40 €). */
export const TRANSFER_ROUND = 5;

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

export type QA = { q: string; a: string };

type Base = {
  id: string;
  planItemId: string;
  title: string;
  /** Short reason, shown on the card. Grounded in the user's own history. */
  reason: string;
  /** Used to decide whether it lands on the shopping list. */
  area: 'grocery' | 'delivery' | 'subscription' | 'transport' | 'eating-out';
  qa: QA[];
  /**
   * Background for the chat assistant: short, self-contained facts in plain
   * language, with every number a user might ask about. The model is told to
   * answer only from these (plus the scenario), so even a cheap model can just
   * quote them. Never claim more than a bank can see.
   */
  facts: string[];
  /** Line under the saving on the Detail screen. A generic one is used when missing. */
  detailNote?: string;
  /** "Näin säästät" steps on the Detail screen. */
  steps?: string[];
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

/** A product in a swap. `image` is a packshot shown on the suggestion card. */
export type SwapProduct = { name: string; price: number; image?: ImageSourcePropType };

export type SwapSuggestion = Base & {
  kind: 'swap';
  from: SwapProduct;
  to: SwapProduct;
  times: number;
  lead: string;
  doneLabel: string;
  /** Tag on the changed forecast row. Defaults to "Halvempi tuote". */
  changedLabel?: string;
};

export type ReduceSuggestion = Base & {
  kind: 'reduce';
  product: string;
  unitPrice: number;
  current: number;
  suggested: number;
  lead: string;
  /** Unit after the quantity, e.g. "kpl" / "cans" or "kertaa" / "times". */
  unit: string;
};

export type Suggestion = RemoveSuggestion | PauseSuggestion | SwapSuggestion | ReduceSuggestion;

export type Transaction = { id: string; date: string; title: string; sub: string; amount: number };
export type ShoppingLine = { id: string; name: string; qty: number; price: number; unit?: string };

/** One self-contained demo scenario. */
export type DemoSet = {
  id: string;
  /** Shown on the Minä tab. */
  name: string;
  description: string;
  /** Today's date in the scenario, e.g. for a transfer made now. */
  today: string;
  payday: string;
  balance: number;
  /** Where the "Siirrä säästöön" suggestion moves money. */
  savingsAccount: { name: string; iban: string; balance: number };
  /** Forecast of spending between today and payday, built from history. */
  plan: PlanItem[];
  /** In review order. */
  suggestions: Suggestion[];
  /** Completed transactions: these never change. */
  transactions: Transaction[];
  /** Next shopping trip. Items tied to a suggestion change when it is accepted. */
  shoppingBase: ShoppingLine[];
};

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

export const unitOf = (s: ReduceSuggestion) => s.unit;

/** A demo set plus the numbers and lookups derived from it. */
export type Demo = DemoSet & {
  /** Language the set's texts are written in. */
  lang: Lang;
  planTotal: number;
  /** Money left on payday if nothing changes. Can be negative. */
  baseline: number;
  /** Sum of all default savings. */
  maxSaving: number;
  byId: (id: string) => Suggestion;
  /** Like byId, but undefined when this set has no such suggestion. */
  find: (id: string) => Suggestion | undefined;
  planItem: (id: string) => PlanItem;
};

export function makeDemo(set: DemoSet, lang: Lang): Demo {
  const planTotal = set.plan.reduce((s, p) => s + p.amount, 0);
  const find = (id: string) => set.suggestions.find((s) => s.id === id);
  return {
    ...set,
    lang,
    planTotal,
    baseline: set.balance - planTotal,
    maxSaving: set.suggestions.reduce((sum, s) => sum + defaultSaving(s), 0),
    byId: (id) => find(id)!,
    find,
    planItem: (id) => set.plan.find((p) => p.id === id)!,
  };
}

/** Picks the Finnish or English text. */
type L = <T>(fi: T, en: T) => T;

// ---------------------------------------------------------------------------
// Suggestions shared by several sets. Same id = same "Kerro lisää" texts.
// ---------------------------------------------------------------------------

const WOLT_SAT = (L: L): RemoveSuggestion => ({
  id: 's-wolt',
  kind: 'remove',
  planItemId: 'p-wolt-sat',
  area: 'delivery',
  title: L('Ruokatilaus lauantaina', 'Saturday food delivery'),
  reason: L('Tilaat Woltista yleensä perjantaina ja lauantaina.', 'You usually order from Wolt on Fridays and Saturdays.'),
  lead: L('Jätä lauantai pois ja säästä', 'Skip Saturday and save'),
  saving: 24.9,
  doneLabel: L('Lauantain Wolt pois', 'No Wolt on Saturday'),
  detailNote: L(
    'Ennen palkkapäivää. Perjantain tilaus pysyy suunnitelmassasi.',
    'Before payday. Your Friday order stays in your plan.',
  ),
  facts: L(
    [
      'Woltin tilaukset tilitapahtumissa: 7.11. 27,10 €, 8.11. 23,60 € ja 13.11. 26,40 €. Lokakuussa samaan tapaan, yleensä perjantaisin ja lauantaisin.',
      'Ennen palkkapäivää 28.11. ennusteessa on kaksi tilausta: perjantai 21.11. (26,40 €) ja lauantai 22.11. (24,90 €).',
      'Asiakas on itse merkinnyt perjantain tilauksen tärkeäksi, joten sitä ei ehdoteta. Ehdotus koskee vain lauantaita 22.11.',
      'Säästö on 24,90 € ennen palkkapäivää. Jos asiakas jättäisi joka toisen lauantain tilauksen pois, vuodessa säästyisi noin 600 €.',
      'Vaihtoehto: kotona tehty pizza tai muu ateria maksaa noin 6 €. Ainekset sisältyvät jo ruokaostosten arvioon (Muut ruokaostokset).',
      'Jos asiakas jättää myös perjantain tilauksen pois, säästö kasvaa 26,40 €:lla, yhteensä 51,30 € ennen palkkapäivää. Sitä ei ehdoteta, koska asiakas on merkinnyt perjantain tärkeäksi, mutta päätös on asiakkaan.',
      'Ehdotus on vain suunnitelma. Se ei estä tilaamista, eikä Woltille kerrota mitään.',
      'Pankki näkee tilauksesta vain summan, päivän ja kauppiaan (Wolt), ei sitä mitä tilattiin tai mistä ravintolasta.',
    ],
    [
      'Wolt orders in the transactions: 7 Nov €27.10, 8 Nov €23.60 and 13 Nov €26.40. October looked the same, usually on Fridays and Saturdays.',
      'Before payday on 28 Nov the forecast has two orders: Friday 21 Nov (€26.40) and Saturday 22 Nov (€24.90).',
      'The customer has marked the Friday order as important, so it is never suggested. This suggestion is only about Saturday 22 Nov.',
      'The saving is €24.90 before payday. If the customer skipped every other Saturday order, it would save about €600 a year.',
      'Alternative: a homemade pizza or other meal costs about €6. The ingredients are already in the grocery estimate (Other groceries).',
      'If the customer also skips the Friday order, the saving grows by €26.40, to €51.30 in total before payday. It is not suggested because the customer marked Friday as important, but the choice is the customer’s.',
      'The suggestion is only a plan. It does not stop ordering, and nothing is told to Wolt.',
      'The bank only sees the amount, date and merchant (Wolt) of an order, not what was ordered or from which restaurant.',
    ],
  ),
  qa: L(
    [
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
    [
      {
        q: 'Why Saturday?',
        a: 'Based on your October transactions, your Saturday order is €24.90 on average, and you have already marked the Friday one as important. That makes Saturday the easiest saving.',
      },
      {
        q: 'What do I eat instead?',
        a: 'A homemade pizza costs about €6. It is already included in your grocery estimate, so the saving stays the same.',
      },
      {
        q: 'Can I undo this later?',
        a: 'Yes. The saving is only a plan and doesn’t stop you from ordering. You can cancel it on the Save tab at any time.',
      },
    ],
  ),
});

const HBO = (L: L): PauseSuggestion => ({
  id: 's-hbo',
  kind: 'pause',
  planItemId: 'p-hbo',
  area: 'subscription',
  title: L('HBO Max tauolle', 'Pause HBO Max'),
  reason: L(
    'Maksat sekä Netflixistä että HBO Maxista, eli kahdesta sarjapalvelusta.',
    'You pay for both Netflix and HBO Max, so two series services.',
  ),
  lead: L('Pidä tauko ja säästä', 'Take a break and save'),
  saving: 9.99,
  monthly: 9.99,
  nextCharge: L('20.11.', '20 Nov'),
  steps: L(
    [
      'Avaa HBO Max -sovellus tai sen verkkosivu.',
      'Mene tilisi asetuksiin ja valitse tilauksen peruminen.',
      'Peru ennen 20.11., niin seuraavaa maksua ei tule.',
    ],
    [
      'Open the HBO Max app or website.',
      'Go to your account settings and choose to cancel the subscription.',
      'Cancel before 20 Nov so the next payment isn’t charged.',
    ],
  ),
  doneLabel: L('HBO Max tauolle', 'HBO Max paused'),
  detailNote: L(
    'Noin 120 € vuodessa. Maksat nyt kolmesta suoratoistopalvelusta.',
    'About €120 a year. You currently pay for three streaming services.',
  ),
  facts: L(
    [
      'Toistuvat suoratoistoveloitukset kuukaudessa: Netflix 13,99 € (5.11.), Spotify 14,99 € (5.11.) ja HBO Max 9,99 € (seuraava veloitus 20.11.). Yhteensä 38,97 € kuussa.',
      'Netflix ja HBO Max ovat molemmat sarja- ja elokuvapalveluita. Spotify on musiikkipalvelu, eikä sitä ehdoteta.',
      'HBO Max on halvempi kahdesta sarjapalvelusta, siksi ehdotus koskee sitä. Asiakas voi yhtä hyvin pitää tauon Netflixistä (13,99 € kuussa).',
      'Säästö on 9,99 € ennen palkkapäivää 28.11. ja noin 120 € vuodessa, jos tauko kestää koko vuoden.',
      'Peruminen: HBO Max -sovellus tai verkkosivu → tilin asetukset → peru tilaus. Peru ennen 20.11., niin seuraavaa maksua ei tule.',
      'Peruminen ei poista tunnusta. Tilauksen voi aloittaa uudelleen milloin vain.',
      'Jos asiakas ei peru, 9,99 € veloitetaan 20.11. ja palkkapäivän arvio laskee takaisin. S-mobiili muistuttaa 18.11.',
      'Pankki ei voi perua tilausta asiakkaan puolesta, eikä se näe kuinka paljon palveluita käytetään. Se näkee vain korttiveloitukset.',
    ],
    [
      'Recurring streaming charges each month: Netflix €13.99 (5 Nov), Spotify €14.99 (5 Nov) and HBO Max €9.99 (next charge 20 Nov). €38.97 a month in total.',
      'Netflix and HBO Max are both series and film services. Spotify is a music service and is not suggested.',
      'HBO Max is the cheaper of the two series services, so the suggestion is about it. The customer could just as well pause Netflix (€13.99 a month) instead.',
      'The saving is €9.99 before payday on 28 Nov, and about €120 a year if the break lasts a whole year.',
      'How to cancel: HBO Max app or website → account settings → cancel subscription. Cancel before 20 Nov so the next payment is not charged.',
      'Cancelling does not delete the account. The subscription can be restarted any time.',
      'If the customer does not cancel, €9.99 is charged on 20 Nov and the payday estimate goes back down. S-mobiili sends a reminder on 18 Nov.',
      'The bank cannot cancel the subscription for the customer, and it cannot see how much the services are used. It only sees the card charges.',
    ],
  ),
  qa: L(
    [
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
    [
      {
        q: 'Can I resume the subscription later?',
        a: 'Yes. Cancelling doesn’t delete your account, so you can subscribe again at any time.',
      },
      {
        q: 'Why did you suggest this one?',
        a: 'You pay for three streaming services, €38.97 a month in total. Pausing one adds about €10 to every payday. You choose which one to keep.',
      },
      {
        q: 'What if I don’t cancel?',
        a: 'Then €9.99 is charged on 20 Nov and the payday estimate goes back down. We’ll remind you on 18 Nov.',
      },
    ],
  ),
});

const CHEESE = (L: L): SwapSuggestion => ({
  id: 's-cheese',
  kind: 'swap',
  planItemId: 'p-cheese',
  area: 'grocery',
  title: L('Halvempi juusto', 'Cheaper cheese'),
  reason: L('Ostat tätä noin 2 kertaa ennen palkkaa.', 'You buy this about twice before payday.'),
  from: { name: 'Valio Oltermanni 900 g', price: 11.49, image: require('../assets/products/oltermanni.png') },
  to: {
    name: L('Arla Kevyt Kermajuusto 1 kg', 'Arla Light Cream Cheese 1 kg'),
    price: 7.99,
    image: require('../assets/products/arla-kevyt.png'),
  },
  times: 2,
  lead: L('Säästät', 'You save'),
  doneLabel: L('Arla Kevyt Kermajuusto', 'Arla Light Cream Cheese'),
  detailNote: L(
    'Arla Kevyt Kermajuusto Valion sijaan, 2 kertaa ennen palkkapäivää.',
    'Arla Light Cream Cheese instead of Valio, twice before payday.',
  ),
  facts: L(
    [
      'S-Etukortin ostotietojen mukaan asiakas ostaa Valio Oltermanni 900 g -juustoa noin kaksi kertaa palkkakauden aikana, yleensä S-marketista.',
      'Valio Oltermanni 900 g maksaa 11,49 € (12,77 €/kg). Arla Kevyt Kermajuusto 1 kg maksaa 7,99 € (7,99 €/kg), eli pakkauksessa on 100 g enemmän.',
      'Ero on 3,50 € pakkaukselta. Kahdesta pakkauksesta säästö on 7,00 € ennen palkkapäivää 28.11. ja noin 80 € vuodessa.',
      'Molemmat ovat mietoja kermajuustoja. Oltermanni Alkuperäisessä on 29 % rasvaa, Arla Kevyessä 17 %, joten Arla on hieman kevyempi.',
      'Arla Kevyt Kermajuusto 1 kg on yleensä samassa hyllyssä kuin Oltermanni S-marketissa.',
      'Muu ostoslista ei muutu. Ehdotus on vain suunnitelma, ja asiakas voi silti ostaa Oltermannia.',
      'S-Etukortin ostotiedot näkyvät S-Etukortti-välilehdellä, ja niiden käytön voi kieltää asetuksista.',
    ],
    [
      'Per S-Etukortti purchase data, the customer buys Valio Oltermanni 900 g cheese about twice per pay period, usually at S-market.',
      'Valio Oltermanni 900 g costs €11.49 (€12.77/kg). Arla Light Cream Cheese 1 kg costs €7.99 (€7.99/kg), so the pack has 100 g more.',
      'The difference is €3.50 per pack. For two packs the saving is €7.00 before payday on 28 Nov, and about €80 a year.',
      'Both are mild cream cheeses. Oltermanni Original has 29% fat and Arla Light 17%, so the Arla one is a little lighter.',
      'Arla Light Cream Cheese 1 kg is usually on the same shelf as Oltermanni at S-market.',
      'Nothing else on the shopping list changes. The suggestion is only a plan, and the customer can still buy Oltermanni.',
      'S-Etukortti purchase data is shown on the S-Etukortti tab, and its use can be turned off in settings.',
    ],
  ),
  qa: L(
    [
      {
        q: 'Onko maku samanlainen?',
        a: 'Molemmat ovat mietoja kermajuustoja. Arla Kevyessä on vähemmän rasvaa (17 % vs. 29 %), joten se on hieman kevyempi.',
      },
      {
        q: 'Mistä tiedät mitä ostan?',
        a: 'S-Etukortin ostotiedoistasi. Näet ne myös S-Etukortti-välilehdellä. Voit kieltää niiden käytön asetuksista.',
      },
    ],
    [
      {
        q: 'Does it taste the same?',
        a: 'Both are mild cream cheeses. Arla Light has less fat (17% vs 29%), so it is a little lighter.',
      },
      {
        q: 'How do you know what I buy?',
        a: 'From your S-Etukortti purchase data. You can also see it on the S-Etukortti tab, and you can turn its use off in settings.',
      },
    ],
  ),
});

/** Price of one Battery 0,5 l can, deposit included. */
const BATTERY_PRICE = 2.69;
const fiEur = (n: number) => `${n.toFixed(2).replace('.', ',')} €`;
const enEur = (n: number) => `€${n.toFixed(2)}`;

/** Battery cans in the forecast (`current` cans before payday, suggested 4). */
const BATTERY_PLAN = (L: L, current = 10): PlanItem => ({
  id: 'p-battery',
  title: L('Battery-energiajuoma 0,5 l', 'Battery energy drink 0.5 l'),
  sub: L(`Yleensä ${current} kpl · S-market, ABC`, `Usually ${current} cans · S-market, ABC`),
  amount: Math.round(current * BATTERY_PRICE * 100) / 100,
  suggestionId: 's-battery',
});

/** `current` = cans usually bought before payday. The suggestion is always 4. */
const BATTERY = (L: L, current = 10): ReduceSuggestion => {
  const suggested = 4;
  const total = current * BATTERY_PRICE;
  const saved = (current - suggested) * BATTERY_PRICE;
  return {
    id: 's-battery',
    kind: 'reduce',
    planItemId: 'p-battery',
    area: 'grocery',
    title: L('Vähemmän energiajuomia', 'Fewer energy drinks'),
    reason: L(
      `Ostat noin ${current} tölkkiä ennen palkkapäivää, yleensä arkiaamuisin.`,
      `You buy about ${current} cans before payday, usually on weekday mornings.`,
    ),
    product: L('Battery 0,5 l', 'Battery 0.5 l'),
    unit: L('kpl', 'cans'),
    unitPrice: BATTERY_PRICE,
    current,
    suggested,
    lead: L('Säästät', 'You save'),
    facts: L(
      [
        `S-Etukortin ostotietojen mukaan asiakas ostaa noin ${current} Battery 0,5 l -tölkkiä palkkakauden aikana, useimmiten arkiaamuisin S-marketista tai ABC:ltä.`,
        `Yksi tölkki maksaa 2,69 €, mukaan lukien 0,15 € pantti. ${current} tölkkiä maksaa ${fiEur(total)}.`,
        `Ehdotus on 4 tölkkiä ${current}:n sijaan, eli noin kaksi aamua viikossa. Säästö on ${current - suggested} × 2,69 € = ${fiEur(saved)} ennen palkkapäivää 28.11.`,
        `Asiakas voi valita määrän itse (0–${current} tölkkiä); jokainen pois jätetty tölkki säästää 2,69 €.`,
        'Halvempi vaihtoehto: kotona keitetty kahvi maksaa noin 0,20–0,30 € kupilta.',
        'Pankki ei anna terveysneuvoja. Kofeiinista ja terveydestä kannattaa kysyä terveydenhuollosta.',
      ],
      [
        `Per S-Etukortti purchase data, the customer buys about ${current} cans of Battery 0.5 l per pay period, mostly on weekday mornings at S-market or ABC.`,
        `One can costs €2.69, including the €0.15 can deposit. ${current} cans cost ${enEur(total)}.`,
        `The suggestion is 4 cans instead of ${current}, about two mornings a week. The saving is ${current - suggested} × €2.69 = ${enEur(saved)} before payday on 28 Nov.`,
        `The customer can pick the amount (0–${current} cans); every can left out saves €2.69.`,
        'A cheaper option: coffee brewed at home costs about €0.20–0.30 a cup.',
        'The bank does not give health advice. Questions about caffeine and health are best asked from a health professional.',
      ],
    ),
    qa: L(
      [
        {
          q: 'Miksi 4 tölkkiä?',
          a: 'Neljä tölkkiä riittää kahdeksi aamuksi viikossa. Voit valita itse määrän, ja säästö päivittyy heti.',
        },
        {
          q: 'Lasketaanko pantti mukaan?',
          a: 'Kyllä. Hinta 2,69 € sisältää 0,15 € pantin.',
        },
      ],
      [
        {
          q: 'Why 4 cans?',
          a: 'Four cans cover two mornings a week. You can pick the amount yourself, and the saving updates right away.',
        },
        {
          q: 'Is the deposit included?',
          a: 'Yes. The €2.69 price includes the €0.15 can deposit.',
        },
      ],
    ),
  };
};

const SHOPPING_BASE = (L: L): ShoppingLine[] => [
  { id: 'l-milk', name: L('Valio rasvaton maito 1 l', 'Valio skimmed milk 1 l'), qty: 2, price: 1.29 },
  { id: 'l-rye', name: L('Fazer Ruispalat 6 kpl', 'Fazer Ruispalat rye bread, 6 pcs'), qty: 1, price: 2.15 },
  { id: 'l-banana', name: L('Banaani', 'Bananas'), qty: 1, price: 1.49, unit: L('n. 1 kg', 'approx. 1 kg') },
  { id: 'l-eggs', name: L('Kotimaista kananmunat 10 kpl', 'Kotimaista eggs, 10 pcs'), qty: 1, price: 2.45 },
  { id: 'l-pasta', name: L('Kotimaista spagetti 1 kg', 'Kotimaista spaghetti 1 kg'), qty: 1, price: 1.39 },
];

/** Texts shared by the fixed bills and common transactions of every set. */
const common = (L: L) => ({
  savings: L('Säästötili', 'Savings account'),
  card: L('Korttiosto', 'Card purchase'),
  einvoice: L('E-lasku', 'E-invoice'),
  bankTransfer: L('Tilisiirto', 'Bank transfer'),
  rent: L('Vuokra · Kiinteistö Oy Vaasankatu', 'Rent · Kiinteistö Oy Vaasankatu'),
  salary: L('Palkka', 'Salary'),
  due: (fi: string, en: string) => L(`Eräpäivä ${fi}`, `Due ${en}`),
  charge: (fi: string, en: string) => L(`Veloitus ${fi}`, `Charged ${en}`),
  woltSat: L('La 22.11. · arvio', 'Sat 22 Nov · estimate'),
  woltFri: L('Pe 21.11. · arvio', 'Fri 21 Nov · estimate'),
  woltOrder: L('Wolt-tilaus', 'Wolt order'),
  cheeseSub: L('Yleensä 2 kertaa · S-market', 'Usually twice · S-market'),
  otherGroceries: L('Muut ruokaostokset', 'Other groceries'),
  groceriesSub: L('4 kauppakäyntiä · arvio', '4 shopping trips · estimate'),
  power: L('Helen sähkö', 'Helen electricity'),
  phone: L('Elisa puhelinlasku', 'Elisa phone bill'),
  ins: L('If kotivakuutus', 'If home insurance'),
  gym: L('Kuntosali', 'Gym'),
  other: L('Muut menot', 'Other expenses'),
  today: L('14.11.', '14 Nov'),
  payday: L('28.11.', '28 Nov'),
  /** Short transaction dates: "13.11." / "13 Nov". */
  d: (day: number, month: 10 | 11) => L(`${String(day).padStart(2, '0')}.${month}.`, `${day} ${month === 10 ? 'Oct' : 'Nov'}`),
});

// ---------------------------------------------------------------------------
// Set 1: the original mockups. All defaults give 64 € → 122 € (+58 €).
// ---------------------------------------------------------------------------

const BASIC = (L: L): DemoSet => {
  const c = common(L);
  return {
    id: 'basic',
    name: L('Perustilanne', 'Basic situation'),
    description: L(
      'Rahaa jää palkkapäivänä, ja pienet säästöt kasvattavat puskuria. Lopuksi ehdotetaan siirtoa säästötilille.',
      'There is money left on payday, and small savings grow the buffer. At the end, a transfer to savings is suggested.',
    ),
    today: c.today,
    payday: c.payday,
    balance: 612.4,
    savingsAccount: { name: c.savings, iban: 'FI98 7654 3210 9876 54', balance: 1240 },
    plan: [
      { id: 'p-wolt-sat', title: c.woltOrder, sub: c.woltSat, amount: 24.9, suggestionId: 's-wolt' },
      { id: 'p-hbo', title: 'HBO Max', sub: c.charge('20.11.', '20 Nov'), amount: 9.99, suggestionId: 's-hbo' },
      { id: 'p-cheese', title: 'Valio Oltermanni 900 g', sub: c.cheeseSub, amount: 22.98, suggestionId: 's-cheese' },
      BATTERY_PLAN(L),
      { id: 'p-wolt-fri', title: c.woltOrder, sub: c.woltFri, amount: 26.4, protectedByUser: true },
      { id: 'p-groceries', title: c.otherGroceries, sub: c.groceriesSub, amount: 186.4 },
      { id: 'p-power', title: c.power, sub: c.due('24.11.', '24 Nov'), amount: 38.5, fixed: true },
      { id: 'p-phone', title: c.phone, sub: c.due('25.11.', '25 Nov'), amount: 19.9, fixed: true },
      { id: 'p-ins', title: c.ins, sub: c.due('27.11.', '27 Nov'), amount: 34.2, fixed: true },
      { id: 'p-gym', title: c.gym, sub: c.charge('20.11.', '20 Nov'), amount: 29.9, fixed: true },
      { id: 'p-other', title: c.other, sub: L('Liikenne, kahvilat ym. · arvio', 'Transport, cafés etc. · estimate'), amount: 128.17 },
    ],
    suggestions: [HBO(L), WOLT_SAT(L), CHEESE(L), BATTERY(L)],
    transactions: [
      { id: 't1', date: c.d(13, 11), title: 'Wolt', sub: c.card, amount: -26.4 },
      { id: 't2', date: c.d(13, 11), title: 'S-market Kallio', sub: c.card, amount: -31.84 },
      { id: 't3', date: c.d(12, 11), title: 'HSL', sub: c.card, amount: -3.2 },
      { id: 't4', date: c.d(11, 11), title: 'ABC Kamppi', sub: c.card, amount: -8.07 },
      { id: 't5', date: c.d(10, 11), title: 'Prisma Itäkeskus', sub: c.card, amount: -54.12 },
      { id: 't6', date: c.d(8, 11), title: 'Wolt', sub: c.card, amount: -23.6 },
      { id: 't7', date: c.d(7, 11), title: 'Wolt', sub: c.card, amount: -27.1 },
      { id: 't8', date: c.d(5, 11), title: 'Netflix', sub: c.card, amount: -13.99 },
      { id: 't9', date: c.d(5, 11), title: 'Spotify', sub: c.card, amount: -14.99 },
      { id: 't10', date: c.d(3, 11), title: c.rent, sub: c.einvoice, amount: -720 },
      { id: 't11', date: c.d(31, 10), title: c.salary, sub: c.bankTransfer, amount: 2140.0 },
    ],
    shoppingBase: SHOPPING_BASE(L),
  };
};

// ---------------------------------------------------------------------------
// Set 2: a tight month. Without changes the money runs out before payday
// (−40,28 €); all defaults lift it to +58,96 € (+99,24 €). The transfer card stays
// hidden, because the margin left is smaller than TRANSFER_BUFFER.
// HSL prices are HSL's 2026 fares: AB single ticket 3,30 €, 30-day AB season
// ticket 61,60 € as a continuous order (jatkuva tilaus). The customer pays
// every trip with a single ticket (~40 a month, 132 €). Before payday the
// forecast has ~20 trips (66,00 €), so the swap only saves 4,40 € in this
// period; the real point is the ~70 € a month after it.
// ---------------------------------------------------------------------------

/** Forecast row for the HSL single tickets before payday. Shared by the sets that use HSL(L). */
const HSL_PLAN = (L: L): PlanItem => ({
  id: 'p2-hsl',
  title: L('HSL-kertaliput AB', 'HSL AB single tickets'),
  sub: L('Noin 20 matkaa · arvio', 'About 20 trips · estimate'),
  amount: 66,
  suggestionId: 's2-hsl',
});

/** One HSL single-ticket charge, as it shows on the account. Two a day on weekdays. */
const HSL_TRIP = (L: L, c: ReturnType<typeof common>, n: number, day: number): Transaction => ({
  id: `t-hsl${n}`,
  date: c.d(day, 11),
  title: 'HSL',
  sub: L('Kertalippu AB', 'AB single ticket'),
  amount: -3.3,
});

const HSL = (L: L): SwapSuggestion => ({
  id: 's2-hsl',
  kind: 'swap',
  planItemId: 'p2-hsl',
  area: 'transport',
  title: L('Vaihda kausilippuun', 'Switch to a season ticket'),
  reason: L(
    'Maksat HSL-matkat kertalipuilla, noin 132 € kuussa. Kausilippu maksaa 61,60 €, eli säästät noin 70 € kuussa.',
    'You pay for HSL trips with single tickets, about €132 a month. A season ticket costs €61.60, saving about €70 a month.',
  ),
  from: { name: L('20 kertalippua AB', '20 AB single tickets'), price: 66 },
  to: { name: L('Kausilippu AB, jatkuva tilaus', 'AB season ticket, continuous order'), price: 61.6 },
  times: 1,
  lead: L('Säästät ennen palkkapäivää', 'You save before payday'),
  doneLabel: L('HSL-kausilippu', 'HSL season ticket'),
  changedLabel: L('Kausilippu', 'Season ticket'),
  detailNote: L(
    'Sen jälkeen noin 70 € joka kuukausi, eli noin 840 € vuodessa, kun matkustat kuten ennenkin.',
    'After that about €70 every month, about €840 a year, if you travel as you do now.',
  ),
  steps: L(
    [
      'Avaa HSL-sovellus.',
      'Valitse 30 päivän AB-kausilippu jatkuvana tilauksena.',
      'Aloita lippu heti, niin seuraavista matkoista ei makseta erikseen.',
    ],
    [
      'Open the HSL app.',
      'Choose the 30-day AB season ticket as a continuous order.',
      'Start the ticket right away, so your next trips aren’t paid one by one.',
    ],
  ),
  facts: L(
    [
      'Asiakas maksaa HSL-matkansa kertalipuilla. Tilillä näkyy HSL:n 3,30 €:n veloituksia lähes joka arkipäivä, yleensä kaksi päivässä.',
      'Viime kuukausina veloituksia on ollut noin 40 kuukaudessa, eli noin 132 € kuussa (40 × 3,30 €).',
      'HSL:n vuoden 2026 hinnasto: AB-kertalippu 3,30 €, 10 matkan AB-sarjalippu 29,70 € ja 30 päivän AB-kausilippu jatkuvana tilauksena 61,60 €.',
      'Ennen palkkapäivää 28.11. ennusteessa on arviolta 20 matkaa, eli 66,00 € kertalipuilla. Kausilippu maksaa 61,60 € heti, joten säästö ennen palkkapäivää on vain 4,40 €.',
      'Tänään (14.11.) aloitettu 30 päivän lippu on voimassa 13.12. asti, eli suurin osa sen hyödystä tulee palkkapäivän jälkeen.',
      'Koko kuukaudessa säästö on noin 70 € (132 € − 61,60 € = 70,40 €), eli noin 840 € vuodessa, jos matkustaminen pysyy samana.',
      'Kausilippu on halvempi, kun matkoja on vähintään 19 30 päivässä (19 × 3,30 € = 62,70 €). Sarjalipullakin 40 matkaa maksaisi 118,80 €.',
      'HSL:n lähimaksussa on 2.11.2026 alkaen vuorokauden hintakatto, AB-vyöhykkeillä 10,60 €. Kahdella matkalla päivässä (6,60 €) se ei laske hintaa.',
      'HSL:n hinnat nousevat 1.1.2027: AB-kertalippu 3,35 € ja jatkuva tilaus 62,80 €.',
      'Jatkuva tilaus uusiutuu itsestään 30 päivän välein. Se tehdään HSL-sovelluksessa. Tilauksen ehdot, myös lopettamisen, näkee HSL-sovelluksesta ennen tilaamista. Pankki ei tunne niitä tarkemmin.',
    ],
    [
      'The customer pays for HSL trips with single tickets. The account shows €3.30 HSL charges almost every weekday, usually two a day.',
      'In recent months there have been about 40 such charges a month, about €132 a month (40 × €3.30).',
      'HSL’s 2026 fares: AB single ticket €3.30, 10-trip AB series ticket €29.70, and the 30-day AB season ticket as a continuous order €61.60.',
      'Before payday on 28 Nov the forecast has about 20 trips, €66.00 in single tickets. The season ticket costs €61.60 up front, so the saving before payday is only €4.40.',
      'A 30-day ticket started today (14 Nov) is valid until 13 Dec, so most of its benefit comes after payday.',
      'Over a full month the saving is about €70 (€132 − €61.60 = €70.40), about €840 a year if the customer keeps travelling the same way.',
      'The season ticket is cheaper from 19 trips per 30 days (19 × €3.30 = €62.70). Even with series tickets, 40 trips would cost €118.80.',
      'Since 2 Nov 2026 HSL’s contactless payment has a daily price cap, €10.60 for zones AB. With two trips a day (€6.60) it does not lower the price.',
      'HSL prices go up on 1 Jan 2027: AB single ticket €3.35 and the continuous order €62.80.',
      'A continuous order renews itself every 30 days. It is set up in the HSL app. The order’s terms, including how to stop it, are shown in the HSL app before ordering. The bank does not know them in more detail.',
    ],
  ),
  qa: L(
    [
      {
        q: 'Miksi säästö on nyt vain 4,40 €?',
        a: 'Ennen palkkapäivää matkoja on arviolta 20, eli 66,00 € kertalipuilla. Kausilippu maksaa 61,60 € heti, mutta se on voimassa 13.12. asti. Koko kuukaudessa säästät noin 70 €.',
      },
      {
        q: 'Kannattaako se, jos matkustan vähemmän?',
        a: 'Kausilippu on halvempi, kun matkustat vähintään 19 kertaa 30 päivässä. Viime kuukausina olet matkustanut noin 40 kertaa kuussa.',
      },
      {
        q: 'Voinko lopettaa tilauksen?',
        a: 'Tilauksen ehdot, myös sen lopettamisen, näet HSL-sovelluksesta ennen kuin tilaat. Jos et jonain kuukautena matkusta paljon, kertaliput voivat tulla halvemmiksi.',
      },
    ],
    [
      {
        q: 'Why is the saving only €4.40 now?',
        a: 'Before payday you have about 20 trips, €66.00 in single tickets. The season ticket costs €61.60 up front, but it stays valid until 13 Dec. Over a full month you save about €70.',
      },
      {
        q: 'Is it worth it if I travel less?',
        a: 'The season ticket is cheaper once you travel at least 19 times in 30 days. In recent months you have travelled about 40 times a month.',
      },
      {
        q: 'Can I stop the order?',
        a: 'You can see the order’s terms, including how to stop it, in the HSL app before you order. If you don’t travel much in some month, single tickets may be cheaper.',
      },
    ],
  ),
});

const LUNCH = (L: L): ReduceSuggestion => ({
  id: 's2-lunch',
  kind: 'reduce',
  planItemId: 'p2-lunch',
  area: 'grocery',
  title: L('Eväät osana viikkoa', 'Packed lunch some days'),
  reason: L(
    'Ostat arkipäivisin valmisaterian S-marketista lounaaksi, keskimäärin 5,99 € kerralla.',
    'On weekdays you buy a ready meal from S-market for lunch, €5.99 each time on average.',
  ),
  product: L('Valmisateria', 'Ready meal'),
  unit: L('kertaa', 'times'),
  unitPrice: 5.99,
  current: 9,
  suggested: 4,
  lead: L('Säästät', 'You save'),
  facts: L(
    [
      'S-Etukortin ostotietojen mukaan asiakas ostaa lähes joka arkipäivä valmisaterian tai -salaatin S-market Kampista, keskimäärin 5,99 €.',
      'Ennen palkkapäivää 28.11. on vielä 9 arkipäivää, joten ennusteessa on 9 valmisateriaa, yhteensä 53,91 €.',
      'Ehdotus: valmisateria 4 kertaa ja eväät 5 päivänä. Säästö on 5 × 5,99 € = 29,95 € ennen palkkapäivää.',
      'Asiakas voi valita määrän itse (0–9 kertaa); jokainen eväspäivä säästää 5,99 €.',
      'Kotona tehty lounas, esimerkiksi pasta, keitto tai kana ja riisi, maksaa noin 1,50–2,50 € annokselta. Ainekset on jo lisätty ruokaostosten arvioon.',
      'Vinkki: kun tekee illalla kaksi annosta, toinen on seuraavan päivän eväs.',
    ],
    [
      'Per S-Etukortti purchase data, the customer buys a ready meal or salad at S-market Kamppi almost every weekday, €5.99 on average.',
      'There are 9 weekdays left before payday on 28 Nov, so the forecast has 9 ready meals, €53.91 in total.',
      'Suggestion: a ready meal 4 times and packed lunch on 5 days. The saving is 5 × €5.99 = €29.95 before payday.',
      'The customer can pick the amount (0–9 times); every packed-lunch day saves €5.99.',
      'A homemade lunch such as pasta, soup or chicken and rice costs about €1.50–2.50 a portion. The ingredients are already added to the grocery estimate.',
      'Tip: cook two portions in the evening and one is the next day’s lunch.',
    ],
  ),
  qa: L(
    [
      {
        q: 'Miksi 4 kertaa?',
        a: 'Jos teet eväät viitenä päivänä, ostat valmisaterian vielä neljästi ennen palkkapäivää. Voit valita itse määrän, ja säästö päivittyy heti.',
      },
      {
        q: 'Paljonko eväät maksavat?',
        a: 'Kotona tehty lounas, esimerkiksi pasta tai keitto, maksaa noin 1,50–2,50 € annokselta. Eväiden ainekset on jo lisätty ruokaostostesi arvioon.',
      },
      {
        q: 'Mistä tiedät mitä ostan?',
        a: 'S-Etukortin ostotiedoistasi. Näet ne myös S-Etukortti-välilehdellä. Voit kieltää niiden käytön asetuksista.',
      },
    ],
    [
      {
        q: 'Why 4 times?',
        a: 'If you pack lunch on five days, you still buy a ready meal four times before payday. You can pick the amount yourself, and the saving updates right away.',
      },
      {
        q: 'How much does a packed lunch cost?',
        a: 'A homemade lunch, such as pasta or soup, costs about €1.50–2.50 a portion. The ingredients are already added to your grocery estimate.',
      },
      {
        q: 'How do you know what I buy?',
        a: 'From your S-Etukortti purchase data. You can also see it on the S-Etukortti tab, and you can turn its use off in settings.',
      },
    ],
  ),
});

const COFFEE = (L: L): ReduceSuggestion => ({
  id: 's2-coffee',
  kind: 'reduce',
  planItemId: 'p2-coffee',
  area: 'eating-out',
  title: L('Vähemmän kahvilakahveja', 'Fewer café coffees'),
  reason: L(
    'Ostat kahvin mukaan Espresso Housesta lähes joka arkiaamu, keskimäärin 4,60 € kerralla.',
    'You buy a takeaway coffee at Espresso House almost every weekday morning, €4.60 each time on average.',
  ),
  product: L('Kahvi mukaan', 'Takeaway coffee'),
  unit: L('kertaa', 'times'),
  unitPrice: 4.6,
  current: 9,
  suggested: 4,
  lead: L('Säästät', 'You save'),
  facts: L(
    [
      'Tilitapahtumien mukaan asiakas maksaa Espresso House Kampissa lähes joka arkiaamu, keskimäärin 4,60 € kerralla (esim. 12.11. ja 13.11.).',
      'Pankki näkee vain summan, päivän ja paikan, ei sitä mitä ostettiin.',
      'Ennen palkkapäivää 28.11. on 9 arkiaamua, joten ennusteessa on 9 kahvia, yhteensä 41,40 €.',
      'Ehdotus: kahvila 4 kertaa (noin kaksi kertaa viikossa). Säästö on 5 × 4,60 € = 23,00 € ennen palkkapäivää.',
      'Asiakas voi valita määrän itse (0–9 kertaa); jokainen väliin jätetty kerta säästää 4,60 €.',
      'Kotona keitetty kahvi maksaa noin 0,20–0,30 € kupilta. Termosmuki kotoa on alle kymmenesosa kahvilan hinnasta.',
    ],
    [
      'Per the transactions, the customer pays at Espresso House Kamppi almost every weekday morning, €4.60 on average (e.g. 12 Nov and 13 Nov).',
      'The bank only sees the amount, date and place, not what was bought.',
      'There are 9 weekday mornings before payday on 28 Nov, so the forecast has 9 coffees, €41.40 in total.',
      'Suggestion: the café 4 times (about twice a week). The saving is 5 × €4.60 = €23.00 before payday.',
      'The customer can pick the amount (0–9 times); every skipped visit saves €4.60.',
      'Coffee brewed at home costs about €0.20–0.30 a cup. A travel mug from home is less than a tenth of the café price.',
    ],
  ),
  qa: L(
    [
      {
        q: 'Miksi 4 kertaa?',
        a: 'Kaksi kahvilakahvia viikossa jättää tavan voimaan, mutta puolittaa sen hinnan. Voit valita itse määrän, ja säästö päivittyy heti.',
      },
      {
        q: 'Paljonko kotikahvi maksaa?',
        a: 'Kotona keitetty kuppi maksaa noin 0,20–0,30 €. Termosmukillinen kotoa on siis alle kymmenesosa kahvilan hinnasta.',
      },
    ],
    [
      {
        q: 'Why 4 times?',
        a: 'Two café coffees a week keep the habit but halve what it costs. You can pick the amount yourself, and the saving updates right away.',
      },
      {
        q: 'How much does coffee at home cost?',
        a: 'A cup brewed at home costs about €0.20–0.30. A travel mug from home is less than a tenth of the café price.',
      },
    ],
  ),
});

const TIGHT = (L: L): DemoSet => {
  const c = common(L);
  return {
    id: 'tight',
    name: L('Tiukka kuukausi', 'Tight month'),
    description: L(
      'Rahat loppuvat ennen palkkapäivää. Ehdotukset nostavat arvion miinukselta plussalle, mukana HSL-kausilippu.',
      'The money runs out before payday. The suggestions lift the estimate from minus to plus, including the HSL season ticket.',
    ),
    today: c.today,
    payday: c.payday,
    balance: 560.4,
    savingsAccount: { name: c.savings, iban: 'FI98 7654 3210 9876 54', balance: 180 },
    plan: [
      HSL_PLAN(L),
      {
        id: 'p2-lunch',
        title: L('Valmisateriat lounaaksi', 'Ready meals for lunch'),
        sub: L('Yleensä 9 kertaa · S-market Kamppi', 'Usually 9 times · S-market Kamppi'),
        amount: 53.91,
        suggestionId: 's2-lunch',
      },
      {
        id: 'p2-coffee',
        title: L('Kahvilakahvit', 'Café coffees'),
        sub: L('Yleensä 9 kertaa · Espresso House', 'Usually 9 times · Espresso House'),
        amount: 41.4,
        suggestionId: 's2-coffee',
      },
      { id: 'p-wolt-sat', title: c.woltOrder, sub: c.woltSat, amount: 24.9, suggestionId: 's-wolt' },
      { id: 'p-hbo', title: 'HBO Max', sub: c.charge('20.11.', '20 Nov'), amount: 9.99, suggestionId: 's-hbo' },
      { id: 'p-cheese', title: 'Valio Oltermanni 900 g', sub: c.cheeseSub, amount: 22.98, suggestionId: 's-cheese' },
      { id: 'p-wolt-fri', title: c.woltOrder, sub: c.woltFri, amount: 26.4, protectedByUser: true },
      { id: 'p-groceries', title: c.otherGroceries, sub: c.groceriesSub, amount: 148.6 },
      { id: 'p-power', title: c.power, sub: c.due('24.11.', '24 Nov'), amount: 38.5, fixed: true },
      { id: 'p-phone', title: c.phone, sub: c.due('25.11.', '25 Nov'), amount: 19.9, fixed: true },
      { id: 'p-ins', title: c.ins, sub: c.due('27.11.', '27 Nov'), amount: 34.2, fixed: true },
      { id: 'p-gym', title: c.gym, sub: c.charge('20.11.', '20 Nov'), amount: 29.9, fixed: true },
      { id: 'p-other', title: c.other, sub: L('Kioskit, apteekki ym. · arvio', 'Kiosks, pharmacy etc. · estimate'), amount: 84 },
    ],
    suggestions: [HBO(L), HSL(L), LUNCH(L), COFFEE(L), WOLT_SAT(L), CHEESE(L)],
    transactions: [
      { id: 't1', date: c.d(13, 11), title: 'Espresso House Kamppi', sub: c.card, amount: -4.6 },
      { id: 't2', date: c.d(13, 11), title: 'S-market Kamppi', sub: c.card, amount: -5.99 },
      HSL_TRIP(L, c, 1, 13),
      HSL_TRIP(L, c, 2, 13),
      { id: 't3', date: c.d(12, 11), title: 'Wolt', sub: c.card, amount: -25.8 },
      { id: 't4', date: c.d(12, 11), title: 'Espresso House Kamppi', sub: c.card, amount: -4.6 },
      { id: 't5', date: c.d(12, 11), title: 'S-market Kamppi', sub: c.card, amount: -5.99 },
      HSL_TRIP(L, c, 3, 12),
      HSL_TRIP(L, c, 4, 12),
      HSL_TRIP(L, c, 5, 11),
      HSL_TRIP(L, c, 6, 11),
      { id: 't6', date: c.d(10, 11), title: 'Prisma Itäkeskus', sub: c.card, amount: -61.3 },
      HSL_TRIP(L, c, 7, 10),
      HSL_TRIP(L, c, 8, 10),
      { id: 't7', date: c.d(7, 11), title: 'Wolt', sub: c.card, amount: -27.1 },
      { id: 't8', date: c.d(5, 11), title: 'Netflix', sub: c.card, amount: -13.99 },
      { id: 't9', date: c.d(5, 11), title: 'Spotify', sub: c.card, amount: -14.99 },
      { id: 't10', date: c.d(3, 11), title: c.rent, sub: c.einvoice, amount: -720 },
      { id: 't11', date: c.d(31, 10), title: c.salary, sub: c.bankTransfer, amount: 2140.0 },
    ],
    shoppingBase: SHOPPING_BASE(L),
  };
};

// ---------------------------------------------------------------------------
// Set 3: almost nothing left on payday (8,00 €). All defaults add 70,50 €, so
// payday ends at 78,50 € and the transfer card suggests 25 € (it is capped by
// TRANSFER_BUFFER, not TRANSFER_SHARE), leaving ~53 € on S-Tili.
// ---------------------------------------------------------------------------

/** Battery cans before payday in this set (13 → 4 saves 24,21 €). */
const NEAR_ZERO_CANS = 13;

const NEAR_ZERO = (L: L): DemoSet => {
  const c = common(L);
  return {
    id: 'near-zero',
    name: L('Lähes nollassa', 'Close to zero'),
    description: L(
      'Palkkapäivänä jäisi vain 8 €. Viisi pientä muutosta nostavat arvion yli 78 €:oon, ja osan voi siirtää säästötilille.',
      'Only €8 would be left on payday. Five small changes lift the estimate above €78, and part of it can go to savings.',
    ),
    today: c.today,
    payday: c.payday,
    balance: 536.04,
    savingsAccount: { name: c.savings, iban: 'FI98 7654 3210 9876 54', balance: 95 },
    plan: [
      { id: 'p-hbo', title: 'HBO Max', sub: c.charge('20.11.', '20 Nov'), amount: 9.99, suggestionId: 's-hbo' },
      HSL_PLAN(L),
      BATTERY_PLAN(L, NEAR_ZERO_CANS),
      { id: 'p-wolt-sat', title: c.woltOrder, sub: c.woltSat, amount: 24.9, suggestionId: 's-wolt' },
      { id: 'p-cheese', title: 'Valio Oltermanni 900 g', sub: c.cheeseSub, amount: 22.98, suggestionId: 's-cheese' },
      { id: 'p-wolt-fri', title: c.woltOrder, sub: c.woltFri, amount: 26.4, protectedByUser: true },
      { id: 'p-groceries', title: c.otherGroceries, sub: c.groceriesSub, amount: 152.3 },
      { id: 'p-power', title: c.power, sub: c.due('24.11.', '24 Nov'), amount: 38.5, fixed: true },
      { id: 'p-phone', title: c.phone, sub: c.due('25.11.', '25 Nov'), amount: 19.9, fixed: true },
      { id: 'p-ins', title: c.ins, sub: c.due('27.11.', '27 Nov'), amount: 34.2, fixed: true },
      { id: 'p-gym', title: c.gym, sub: c.charge('20.11.', '20 Nov'), amount: 29.9, fixed: true },
      { id: 'p-other', title: c.other, sub: L('Kioskit, apteekki ym. · arvio', 'Kiosks, pharmacy etc. · estimate'), amount: 68 },
    ],
    suggestions: [HBO(L), HSL(L), BATTERY(L, NEAR_ZERO_CANS), WOLT_SAT(L), CHEESE(L)],
    transactions: [
      { id: 't1', date: c.d(13, 11), title: 'Wolt', sub: c.card, amount: -26.4 },
      { id: 't2', date: c.d(13, 11), title: 'ABC Kamppi', sub: c.card, amount: -2.69 },
      HSL_TRIP(L, c, 1, 13),
      HSL_TRIP(L, c, 2, 13),
      { id: 't3', date: c.d(12, 11), title: 'S-market Kallio', sub: c.card, amount: -24.37 },
      HSL_TRIP(L, c, 3, 12),
      HSL_TRIP(L, c, 4, 12),
      { id: 't4', date: c.d(11, 11), title: 'S-market Kallio', sub: c.card, amount: -5.38 },
      HSL_TRIP(L, c, 5, 11),
      HSL_TRIP(L, c, 6, 11),
      { id: 't5', date: c.d(10, 11), title: 'Prisma Itäkeskus', sub: c.card, amount: -48.9 },
      HSL_TRIP(L, c, 7, 10),
      HSL_TRIP(L, c, 8, 10),
      { id: 't6', date: c.d(8, 11), title: 'Wolt', sub: c.card, amount: -23.6 },
      { id: 't7', date: c.d(7, 11), title: 'Wolt', sub: c.card, amount: -27.1 },
      { id: 't8', date: c.d(5, 11), title: 'Netflix', sub: c.card, amount: -13.99 },
      { id: 't9', date: c.d(5, 11), title: 'Spotify', sub: c.card, amount: -14.99 },
      { id: 't10', date: c.d(3, 11), title: c.rent, sub: c.einvoice, amount: -720 },
      { id: 't11', date: c.d(31, 10), title: c.salary, sub: c.bankTransfer, amount: 1980.0 },
    ],
    shoppingBase: SHOPPING_BASE(L),
  };
};

const BUILDERS = [BASIC, TIGHT, NEAR_ZERO];
export const DEFAULT_SET_ID = 'basic';

const cache: Partial<Record<Lang, Demo[]>> = {};

/** All demo sets, with texts in `lang`. */
export function demoSets(lang: Lang): Demo[] {
  if (!cache[lang]) {
    const L: L = (fi, en) => (lang === 'fi' ? fi : en);
    cache[lang] = BUILDERS.map((b) => makeDemo(b(L), lang));
  }
  return cache[lang]!;
}

export const demoById = (id: string, lang: Lang) => demoSets(lang).find((d) => d.id === id) ?? demoSets(lang)[0];
