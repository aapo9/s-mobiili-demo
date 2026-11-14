# S-mobiili · Säästä (demo)

A working React Native and Expo demo of the "Raivaa tilaa" concept. It cleans up unnecessary future spending before payday, inside S-mobiili.

## Run it

```bash
npm install
npx expo start
```

To open it on a phone, scan the QR code with **Expo Go**: the Camera app on iOS, or the Expo Go app on Android. The phone and computer must be on the same Wi-Fi. If they can't be, use `npx expo start --tunnel`.

The app uses Expo SDK 58, so Expo Go must be a version that supports SDK 58. `npx expo start --web` also runs it in a browser.

## Demo script

1. **Koti**: the card says *Löysimme sinulle 58 € edestä säästöjä*. Tap **Kurkista seuraavaan palkkapäivääsi**.
2. **Ehdotus 1–4**: each card names the concrete upcoming purchase it changes.
   - The bar shows the effect as a dashed segment. Accepting turns it solid yellow, and the card sweeps up into the bar.
   - The suggestions are: remove the Saturday Wolt order, pause HBO Max, swap to a cheaper cheese, and cut energy drinks with the − / + stepper. The saving updates live as you step.
   - **Pidän tämän** protects a purchase. It stays in the plan with a lock tag and isn't suggested again.
   - **Kysy tästä** gives tap-only answers. There is deliberately no chat input.
3. **Valmis**: shows *+58 € enemmän* and a reminder to cancel HBO Max.
4. **Katso kauppalista**: the next shopping list already includes the swaps and reductions. **Valmistele ostoskori** prepares the basket.
5. **Säästä** tab: the accepted purchases tick, sweep away and collapse from *Tulevat menot*, one by one.
6. **Pankki**: completed transactions don't change. The payday card links back to Säästä.
7. **Minä → Nollaa demo** resets everything.

## Structure

- `src/data.ts`: demo data, i.e. spending forecast, suggestions, transactions and shopping list.
- `src/state.tsx`: decisions, the computed savings and `planForGoal` (fewest changes, then smallest overshoot).
- `src/components/OutcomeBars.tsx`: the single outcome visualisation.
- `src/components/PlanRow.tsx`: the cleanup animation.
- `src/screens/*`: the screens.
- `src/nav.tsx`: a small in-memory stack plus tabs. Android hardware back is supported.
