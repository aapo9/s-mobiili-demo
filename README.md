# S-mobiili · Säästä (demo)

A savings feature for S-Bank's S-mobiili app that helps people have more money left on payday, without budgeting.

Most money tools look back at what you already spent. Säästä looks ahead. From your own past purchases it estimates what you will still spend before your next payday. Then it suggests a few small, concrete changes to purchases that haven't happened yet, and shows the effect on your payday balance straight away.

## How it works

- **Forecast to payday.** Upcoming bills, subscriptions and typical spending are estimated from data the bank already has: card transactions and S-Etukortti item-level purchases.
- **Concrete suggestions, one at a time.** Each card targets one real upcoming purchase: pause HBO Max before its next charge, skip a Saturday food delivery, switch to a cheaper cheese, buy fewer energy drinks. Accept or reject it with one tap.
- **One clear outcome.** A single bar shows your estimated balance on payday and grows as you accept changes.
- **You stay in control.** A purchase you reject is protected and never suggested again. Completed transactions never change; only the forecast does.
- **Explained, not just advised.** *Kerro lisää* ("Tell me more") explains why a suggestion was made, what it adds up to over a year, and one money concept worth knowing. Ask follow-up questions in your own words; an AI (Gemini) answers only from your data and that suggestion's facts.
- **Savings become real money.** Once you're done, it suggests moving part of the freed money to your savings account. The amount is always less than what you saved and leaves a safe buffer for payday.

This is a clickable prototype built for Junction. It runs on made-up data with three scenarios: a normal month, a tight month where the money runs out before payday, and a month that ends at almost zero.

**Live demo: https://s-mobiili-demo.expo.app** (no install needed: it opens in any phone browser, and on a desktop it's shown in a phone-sized frame)

<img src="docs/demo-qr.png" alt="QR code for the live demo" width="160">

The app is in Finnish by default. Switch to English under **Minä → Language**.

## Run it

Requires Node.js 22.13+ (or 24.3+).

```bash
npm install
cp .env.example .env.local   # optional: add a GEMINI_API_KEY for free-text questions
npx expo start
```

Everything works without a Gemini key. Only free-text questions in **Kerro lisää** need one; without it they get a polite "not enabled" reply.

To open it on a phone, scan the QR code with **Expo Go**: the Camera app on iOS, or the Expo Go app on Android. The phone and computer must be on the same Wi-Fi. If they can't be, use `npx expo start --tunnel`.

The app uses Expo SDK 58, so Expo Go must be a version that supports SDK 58. `npx expo start --web` also runs it in a browser.

## Demo script

1. **Koti**: the card says *Löysimme sinulle helppoja säästöjä*. Tap **Säästä 58 € nyt**.
2. **Säästöt** tab: the hero shows the estimated balance on payday. Tap **Katso säästöt**.
3. **Suggestion cards (1–4)**: each card names the concrete upcoming purchase it changes.
   - The bar shows the effect as a dashed segment. **Hyväksy** turns it solid yellow.
   - The suggestions are: pause HBO Max, remove the Saturday Wolt order, swap to a cheaper cheese, and cut energy drinks with the − / + stepper. The saving updates live as you step.
   - **Hylkää** protects a purchase. It stays in the plan with a lock tag and isn't suggested again.
   - **Kerro lisää** explains the suggestion: why it was made, what it means over a year, and one money concept. The ready-made question chips answer instantly from hand-written texts. Typed questions go to Gemini, grounded in that suggestion's data.
4. **Back on Säästöt**: the balance is now 64 € → 122 € (+58 €). Under *Arvioidut menot* the accepted purchases tick and sweep away. The **Siirrä säästöön** card suggests moving part of the saving to the savings account, always leaving a safe buffer.
5. Tap an accepted change for its details, e.g. how to cancel HBO Max, or **Peru tämä säästö**.
6. **Minä**: switch language, pick another *Demosarja* (*Tiukka kuukausi*, where money runs out before payday, or *Lähes nollassa*), or **Nollaa demo** to reset everything.

## Structure

- `src/data.ts`: demo data as three demo sets: spending forecast, suggestions, transactions and shopping list.
- `src/state.tsx`: decisions, the computed savings and `planForGoal` (fewest changes, then smallest overshoot).
- `src/components/OutcomeBars.tsx`: the single outcome visualisation.
- `src/components/PlanRow.tsx`: the cleanup animation.
- `src/screens/*`: the screens.
- `src/nav.tsx`: a small in-memory stack plus tabs. Android hardware back is supported.
- `src/ai/`: the "Kerro lisää" explanations (hand-written) and the Gemini prompt for typed questions.
- `src/app/api/chat+api.ts`: the server route that holds the Gemini key and calls the model. The app only calls this route, so the key never reaches the client.
- `src/i18n/`: Finnish and English strings.

## License

[MIT](LICENSE)
