/**
 * Hand-written texts for "Kerro lisää": the explanation card and the answers
 * to the tap-only questions. The chat assistant (explainer.ts) gets them as
 * context, so free-text answers stay consistent with what is on screen.
 * Only uses what a bank can actually see: card transactions and
 * S-Etukortti item-level purchases. Never how a service is used.
 *
 * Every text exists in Finnish and English; the language comes from the
 * active demo set (`ctx.demo.lang`).
 */
import { eur, eur0 } from '../theme';
import { Suggestion } from '../data';
import type { Lang } from '../i18n/lang';
import type { ExplainContext, Explanation, TransferContext } from './explainer';

const yearlyAmount = (perPayPeriod: number) => Math.round((perPayPeriod * 12) / 10) * 10;
const yearly = (lang: Lang, perPayPeriod: number) =>
  lang === 'fi' ? `noin ${eur0(yearlyAmount(perPayPeriod))}` : `about ${eur0(yearlyAmount(perPayPeriod))}`;

type Texts = Record<string, (ctx: ExplainContext) => Explanation>;

/** Battery cans usually bought before payday in the active set. */
const cans = (demo: ExplainContext['demo']) => {
  const s = demo.find('s-battery');
  return s?.kind === 'reduce' ? s.current : 10;
};

const NO_SAVING = {
  fi: 'Valitsemallasi määrällä säästöä ei vielä synny. Kokeile pienempää määrää, niin näet vaikutuksen heti.',
  en: 'The amount you picked doesn’t save anything yet. Try a smaller amount to see the effect right away.',
};

const FI: Texts = {
  's-wolt': ({ saving }) => ({
    why: 'Tilitapahtumiesi mukaan tilaat Woltista yleensä perjantaisin ja lauantaisin, noin 25 € kerralla. Perjantain tilauksen olet merkinnyt tärkeäksi, joten ehdotamme vain lauantaita.',
    impact: `Yksi lauantai pois tuo ${eur(saving)} lisää palkkapäivään. Jos tekisit saman joka toinen viikko, vuodessa säästyisi ${yearly('fi', saving * 2)}.`,
    lesson: {
      term: 'Pienet toistuvat menot',
      body: 'Yksittäinen 25 € tilaus tuntuu pieneltä, mutta toistuvana se on usein suurin joustava meno. Katso menoja kuukauden tai vuoden tasolla, niin näet mistä kannattaa luopua ja mistä ei.',
    },
    source: 'Perustuu tilitapahtumiisi viime kuukausilta.',
  }),
  's-hbo': ({ saving }) => ({
    why: 'Tililtäsi veloitetaan joka kuukausi kolme suoratoistopalvelua: Netflix 13,99 €, Spotify 14,99 € ja HBO Max 9,99 €. Netflix ja HBO Max ovat molemmat sarja- ja elokuvapalveluita. Emme näe, kuinka paljon käytät niitä, joten sinä tiedät parhaiten, kumpi on tarpeellisempi.',
    impact: `Tauko säästää ${eur(saving)} ennen palkkapäivää ja ${yearly('fi', saving)}, jos pidät sen koko vuoden. Tunnuksesi säilyy, joten voit palata milloin vain.`,
    lesson: {
      term: 'Tilausten kierrättäminen',
      body: 'Moni pitää yhden sarjapalvelun kerrallaan ja vaihtaa sitä muutaman kuukauden välein. Saat saman sisällön, mutta maksat vain yhdestä kerrallaan. Kannattaa käydä tilaukset läpi pari kertaa vuodessa.',
    },
    source: 'Perustuu toistuviin korttiveloituksiin tililläsi.',
  }),
  's-cheese': ({ saving }) => ({
    why: 'S-Etukortin ostotietojen mukaan ostat Valio Oltermannia 900 g noin kaksi kertaa ennen palkkapäivää. Arla Kevyt Kermajuusto on samaa juustotyyppiä, ja pakkauksessa on jopa 100 g enemmän.',
    impact: `Vaihto säästää ${eur(saving)} ennen palkkapäivää. Vuodessa se tekee ${yearly('fi', saving)}, eikä ostoslistasi muutu muuten.`,
    lesson: {
      term: 'Kilohinta',
      body: 'Vertaa hyllynreunan kilohintaa, älä pakkauksen hintaa. Oltermanni maksaa 12,77 €/kg ja Arla Kevyt 7,99 €/kg. Isompi pakkaus voi olla jopa halvempi kuin pienempi.',
    },
    source: 'Perustuu S-Etukortin ostotietoihisi.',
  }),
  's-battery': ({ saving, qty, demo }) => ({
    why: `S-Etukortin ostotietojen mukaan ostat noin ${cans(demo)} Battery-tölkkiä palkkakauden aikana, useimmiten arkiaamuisin S-marketista tai ABC:ltä.`,
    impact:
      saving > 0
        ? `Kun ostat ${qty ?? 4} tölkkiä, säästät ${eur(saving)} ennen palkkapäivää. Vuodessa se tekee ${yearly('fi', saving)}.`
        : NO_SAVING.fi,
    lesson: {
      term: 'Rutiiniostot',
      body: 'Aamun tölkki on usein tapa eikä päätös. Tapoja on helpointa muuttaa vähän kerrallaan: kun vähennät, ei tarvitse luopua kokonaan, ja säästö kertyy silti joka viikko.',
    },
    source: 'Perustuu S-Etukortin ostotietoihisi.',
  }),
  's2-hsl': ({ saving }) => ({
    why: 'Tilitapahtumiesi mukaan maksat HSL-matkasi kertalipuilla, 3,30 € kerrallaan, yleensä kaksi kertaa arkipäivässä. Viime kuukausina matkoja on ollut noin 40 kuussa, eli noin 132 €. Jatkuvana tilauksena 30 päivän AB-kausilippu maksaa 61,60 €.',
    impact: `Ennen palkkapäivää vaihto tuo vain ${eur(saving)} lisää, koska maksat lipun nyt kerralla. Lippu on kuitenkin voimassa 13.12. asti, ja sen jälkeen säästät noin 70 € joka kuukausi, noin 840 € vuodessa.`,
    lesson: {
      term: 'Hinta per kerta',
      body: 'Kun ostat samaa asiaa kerta kerralta, laske mitä yksi kerta maksaisi kiinteällä hinnalla. Kausilippu 61,60 € tekee 40 matkalla 1,54 € matkalta, kun kertalippu maksaa 3,30 €. Raja kulkee 19 matkassa kuukaudessa.',
    },
    source: 'Perustuu tilitapahtumiisi viime kuukausilta ja HSL:n vuoden 2026 hinnastoon.',
  }),
  's2-lunch': ({ saving, qty }) => ({
    why: 'S-Etukortin ostotietojen mukaan ostat lähes joka arkipäivä valmisaterian tai -salaatin S-market Kampista, keskimäärin 5,99 €. Ennen palkkapäivää arkipäiviä on vielä yhdeksän.',
    impact:
      saving > 0
        ? `Kun ostat lounaan ${qty ?? 4} kertaa ja otat muina päivinä eväät, säästät ${eur(saving)} ennen palkkapäivää. Vuodessa se tekee ${yearly('fi', saving)}.`
        : NO_SAVING.fi,
    lesson: {
      term: 'Hinta per annos',
      body: 'Valmisateria maksaa annokselta 3–4 kertaa enemmän kuin kotona tehty. Kun teet illalla kerralla kaksi annosta, toinen on huomisen eväs, eikä se vaadi erillistä aikaa.',
    },
    source: 'Perustuu S-Etukortin ostotietoihisi.',
  }),
  's2-coffee': ({ saving, qty }) => ({
    why: 'Tilitapahtumiesi mukaan maksat Espresso House Kampissa lähes joka arkiaamu, keskimäärin 4,60 € kerralla. Emme näe mitä ostat, vain summan ja paikan.',
    impact:
      saving > 0
        ? `Kun ostat kahvin mukaan ${qty ?? 4} kertaa, säästät ${eur(saving)} ennen palkkapäivää. Vuodessa se tekee ${yearly('fi', saving)}.`
        : NO_SAVING.fi,
    lesson: {
      term: 'Latte-efekti',
      body: 'Pienet päivittäiset ostot tuntuvat merkityksettömiltä, mutta kertyvät kuukaudessa isoksi summaksi. Ei tarvitse luopua kokonaan: kun pidät parhaat hetket ja jätät rutiinin pois, säästät ja nautit silti.',
    },
    source: 'Perustuu tilitapahtumiisi viime kuukausilta.',
  }),
};

const EN: Texts = {
  's-wolt': ({ saving }) => ({
    why: 'Your transactions show you usually order from Wolt on Fridays and Saturdays, about €25 each time. You have marked the Friday order as important, so we only suggest Saturday.',
    impact: `Skipping one Saturday adds ${eur(saving)} to your payday. If you did the same every other week, you would save ${yearly('en', saving * 2)} a year.`,
    lesson: {
      term: 'Small recurring expenses',
      body: 'A single €25 order feels small, but repeated it is often your biggest flexible expense. Look at spending per month or per year to see what is worth giving up and what isn’t.',
    },
    source: 'Based on your transactions from recent months.',
  }),
  's-hbo': ({ saving }) => ({
    why: 'Three streaming services are charged to your account every month: Netflix €13.99, Spotify €14.99 and HBO Max €9.99. Netflix and HBO Max are both series and film services. We can’t see how much you use them, so you know best which one you need more.',
    impact: `A break saves ${eur(saving)} before payday, and ${yearly('en', saving)} if you keep it for a whole year. Your account stays, so you can come back any time.`,
    lesson: {
      term: 'Rotating subscriptions',
      body: 'Many people keep one series service at a time and switch every few months. You get the same content but only pay for one at a time. It’s worth going through your subscriptions a couple of times a year.',
    },
    source: 'Based on recurring card charges on your account.',
  }),
  's-cheese': ({ saving }) => ({
    why: 'Your S-Etukortti purchase data shows you buy Valio Oltermanni 900 g about twice before payday. Arla Light Cream Cheese is the same type of cheese, and the pack is even 100 g bigger.',
    impact: `The swap saves ${eur(saving)} before payday. Over a year that’s ${yearly('en', saving)}, and nothing else on your shopping list changes.`,
    lesson: {
      term: 'Price per kilo',
      body: 'Compare the price per kilo on the shelf label, not the pack price. Oltermanni costs €12.77/kg and Arla Light €7.99/kg. A bigger pack can even cost less than a smaller one.',
    },
    source: 'Based on your S-Etukortti purchase data.',
  }),
  's-battery': ({ saving, qty, demo }) => ({
    why: `Your S-Etukortti purchase data shows you buy about ${cans(demo)} cans of Battery per pay period, mostly on weekday mornings at S-market or ABC.`,
    impact:
      saving > 0
        ? `If you buy ${qty ?? 4} cans, you save ${eur(saving)} before payday. Over a year that’s ${yearly('en', saving)}.`
        : NO_SAVING.en,
    lesson: {
      term: 'Routine purchases',
      body: 'The morning can is often a habit rather than a decision. Habits are easiest to change a little at a time: cutting down means you don’t have to give it up completely, and the saving still adds up every week.',
    },
    source: 'Based on your S-Etukortti purchase data.',
  }),
  's2-hsl': ({ saving }) => ({
    why: 'Your transactions show you pay for HSL trips with single tickets, €3.30 each time, usually twice a weekday. In recent months that has been about 40 trips a month, about €132. As a continuous order, the 30-day AB season ticket costs €61.60.',
    impact: `Before payday the switch adds only ${eur(saving)}, because you pay for the ticket in one go now. But it stays valid until 13 Dec, and after that you save about €70 every month, about €840 a year.`,
    lesson: {
      term: 'Price per use',
      body: 'When you pay for the same thing one time at a time, work out what one time would cost at a flat price. At 40 trips, the €61.60 season ticket is €1.54 a trip, while a single ticket is €3.30. The break-even point is 19 trips a month.',
    },
    source: 'Based on your transactions from recent months and HSL’s 2026 fares.',
  }),
  's2-lunch': ({ saving, qty }) => ({
    why: 'Your S-Etukortti purchase data shows you buy a ready meal or salad at S-market Kamppi almost every weekday, €5.99 on average. There are nine more weekdays before payday.',
    impact:
      saving > 0
        ? `If you buy lunch ${qty ?? 4} times and pack your own on the other days, you save ${eur(saving)} before payday. Over a year that’s ${yearly('en', saving)}.`
        : NO_SAVING.en,
    lesson: {
      term: 'Price per portion',
      body: 'A ready meal costs 3–4 times more per portion than a homemade one. If you cook two portions at once in the evening, one is tomorrow’s lunch, and it takes no extra time.',
    },
    source: 'Based on your S-Etukortti purchase data.',
  }),
  's2-coffee': ({ saving, qty }) => ({
    why: 'Your transactions show you pay at Espresso House Kamppi almost every weekday morning, €4.60 each time on average. We can’t see what you buy, only the amount and the place.',
    impact:
      saving > 0
        ? `If you buy takeaway coffee ${qty ?? 4} times, you save ${eur(saving)} before payday. Over a year that’s ${yearly('en', saving)}.`
        : NO_SAVING.en,
    lesson: {
      term: 'The latte effect',
      body: 'Small daily purchases feel insignificant but add up to a big sum over a month. You don’t have to give them up: keep the moments you enjoy most, drop the routine ones, and you save while still enjoying it.',
    },
    source: 'Based on your transactions from recent months.',
  }),
};

const TEXTS: Record<Lang, Texts> = { fi: FI, en: EN };

/** The hand-written explanation for a suggestion, shown at the top of "Kerro lisää". */
export function explanationFor(s: Suggestion, ctx: ExplainContext): Explanation {
  const lang = ctx.demo.lang;
  const text = TEXTS[lang][s.id];
  if (text) return text(ctx);
  // A new demo suggestion without hand-written texts: fall back to its own card copy.
  return lang === 'fi'
    ? {
        why: s.reason,
        impact: `Säästö tuo ${eur(ctx.saving)} lisää palkkapäivään ${ctx.demo.payday}. Vuodessa se tekee ${yearly(lang, ctx.saving)}.`,
        lesson: { term: 'Pienet toistuvat menot', body: 'Toistuvat pienet menot ovat usein suurin joustava kulu. Katso niitä kuukauden tai vuoden tasolla.' },
        source: 'Perustuu tilitapahtumiisi ja S-Etukortin ostotietoihisi.',
      }
    : {
        why: s.reason,
        impact: `The saving adds ${eur(ctx.saving)} to your payday on ${ctx.demo.payday}. Over a year that’s ${yearly(lang, ctx.saving)}.`,
        lesson: { term: 'Small recurring expenses', body: 'Small recurring expenses are often your biggest flexible cost. Look at them per month or per year.' },
        source: 'Based on your transactions and S-Etukortti purchase data.',
      };
}

/** "Siirrä säästöön": the explanation. */
export const transferExplanation = (c: TransferContext): Explanation =>
  c.demo.lang === 'fi'
    ? {
        why: `Hyväksymäsi muutokset vapauttivat ${eur(c.saved)} ennen palkkapäivää. Ehdotamme siitä vain osaa, ${eur0(c.amount)}, jotta loput jäävät varaksi. Siirron jälkeen käyttötilillesi jää palkkapäivänä arviolta ${eur0(c.paydayAfter)}, ja vaikka puolet säästöistä jäisi toteutumatta, sinne jäisi silti noin ${eur0(c.ifHalfFails)}.`,
        impact: `Säästötilisi kasvaa ${eur0(c.savingsBalance)} → ${eur0(c.savingsBalance + c.amount)}. Jos siirrät saman verran joka palkkakausi, vuodessa kertyy noin ${eur0(yearlyAmount(c.amount))}.`,
        lesson: {
          term: 'Maksa ensin itsellesi',
          body: 'Käyttötilille jäänyt raha kuluu helposti huomaamatta muuhun. Kun siirrät säästön heti kun se syntyy, säästäminen ei jää sen varaan, mitä kuun lopussa sattuu jäämään.',
        },
        source: 'Perustuu tilisi saldoon, tuleviin laskuihin, arvioituihin ostoksiin ja hyväksymiisi säästöihin.',
      }
    : {
        why: `The changes you accepted freed up ${eur(c.saved)} before payday. We only suggest moving part of it, ${eur0(c.amount)}, so the rest stays as a reserve. After the transfer, about ${eur0(c.paydayAfter)} is left on your spending account on payday, and even if half of the savings didn’t happen, about ${eur0(c.ifHalfFails)} would still be left.`,
        impact: `Your savings account grows ${eur0(c.savingsBalance)} → ${eur0(c.savingsBalance + c.amount)}. If you move the same amount every pay period, about ${eur0(yearlyAmount(c.amount))} builds up in a year.`,
        lesson: {
          term: 'Pay yourself first',
          body: 'Money left on your spending account easily goes on other things without you noticing. When you move a saving as soon as it happens, saving doesn’t depend on whatever happens to be left at the end of the month.',
        },
        source: 'Based on your account balance, upcoming bills, estimated purchases and the savings you accepted.',
      };

/** "Siirrä säästöön": the suggested questions and their answers, in display order. */
export const transferAnswers = (c: TransferContext): Record<string, string> =>
  c.demo.lang === 'fi'
    ? {
        'Miksi juuri nyt?':
          'Säästöt on nyt tehty, mutta raha on yhä käyttötilillä. Mitä kauemmin se odottaa siellä, sitä todennäköisemmin se kuluu muuhun. Siirto nyt tekee säästöstä totta.',
        'Riittävätkö rahani palkkapäivään?': `Arviomme mukaan kyllä. Kun tulevat laskut ja arvioidut ostokset on maksettu, käyttötilille jää noin ${eur0(c.paydayAfter)}. Vaikka puolet säästöistäsi jäisi toteutumatta, sinne jäisi vielä noin ${eur0(c.ifHalfFails)}. Jätämme aina vähintään ${eur0(c.buffer)}, jos menot ovatkin arvioitua suuremmat.`,
        'Miksi en siirrä koko säästöä?': `Voit siirtää, kohdasta Siirrä eri määrä. Ehdotamme vähän pienempää summaa, koska kaikki säästöt eivät aina toteudu suunnitellusti. Kun osa jää käyttötilille, sinun ei tarvitse siirtää rahaa takaisin, jos menot ovatkin arvioitua suuremmat. Puskuria jätämme aina vähintään ${eur0(c.buffer)}.`,
        'Saanko rahat takaisin, jos tarvitsen?': 'Saat. Voit siirtää rahaa säästötililtä takaisin S-Tilille S-mobiilissa milloin vain.',
      }
    : {
        'Why right now?':
          'The savings are done, but the money is still on your spending account. The longer it waits there, the more likely it goes on something else. Moving it now makes the saving real.',
        'Will my money last until payday?': `By our estimate, yes. Once the upcoming bills and estimated purchases are paid, about ${eur0(c.paydayAfter)} is left on your spending account. Even if half of your savings didn’t happen, about ${eur0(c.ifHalfFails)} would still be left. We always leave at least ${eur0(c.buffer)} in case spending turns out higher than estimated.`,
        'Why not move the whole saving?': `You can, with Move a different amount. We suggest a slightly smaller sum because not every saving goes to plan. When part stays on your spending account, you don’t need to move money back if spending turns out higher than estimated. We always leave a buffer of at least ${eur0(c.buffer)}.`,
        'Can I get the money back if I need it?': 'Yes. You can move money from your savings account back to S-Tili in S-mobiili at any time.',
      };
