# S-mobiili · Säästä (demo)

A working React Native and Expo demo of the "Raivaa tilaa" concept. It cleans up unnecessary future spending before payday, inside S-mobiili.

**Live demo: https://s-mobiili-demo.expo.app** (no install needed, open it on a phone or desktop browser)

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

## Try it without Expo Go

The web build is live at **https://s-mobiili-demo.expo.app**. It opens in any phone browser, and on a desktop it's shown in a phone-sized frame. To publish changes there:

```bash
npm run deploy:web   # expo export --platform web && eas deploy --prod --environment production
```

The chat's Gemini key lives only on the server: `GEMINI_API_KEY` in `.env.local` locally, and an EAS environment variable when deployed (set it once with `eas env:create --name GEMINI_API_KEY --environment production --visibility sensitive`). The app calls its own `/api/chat` route, never Google directly.

The QR code for the link is [`docs/demo-qr.png`](docs/demo-qr.png) ([`.svg`](docs/demo-qr.svg) for print and video).

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
- `src/app/api/chat+api.ts`: the server route that holds the Gemini key and calls the model.
- `src/i18n/`: Finnish and English strings.

## License

[MIT](LICENSE)
