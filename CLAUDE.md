# S-mobiili · Säästä demo

A clickable React Native and Expo demo of a "clean up future spending before payday" feature for S-Bank's S-mobiili app. It was built for Junction and runs in Expo Go on Android and iOS. The UI copy is in **Finnish**.

The source design is `../S-mobiili – Raivaa tilaa -konseptit.html`. It's a bundled file of seven 390×844 mockups, so the HTML is packed and has to be unpacked before you can read it. Match its colors, type sizes and spacing; the tokens live in `src/theme.ts`.

## Commands

Run everything from this folder (`s-mobiili-demo/`), not from the parent `SPankki/`.

```bash
npx expo start            # dev server; scan QR with Expo Go (--tunnel if not on same Wi-Fi)
npx expo start --web      # browser
npx tsc --noEmit          # typecheck (must pass)
npx expo-doctor           # dependency/config check
npx expo install <pkg>    # add deps (never plain npm install <pkg>)
```

- **Expo SDK:** SDK 58, RN 0.88, React 19.3. APIs change between SDKs, so check `https://docs.expo.dev/versions/v58.0.0/` rather than relying on memory.
- **Native modules:** only use ones that ship in Expo Go. A dev build is out of scope.

## Architecture

- `App.tsx`: loads the Figtree fonts and sets up the providers. It renders only the current route with a slide-in transition, plus `TabBar`.
- `src/nav.tsx`: a small in-memory stack navigator with 5 tabs (`home | card | save | account | me`).
  - It provides `push / replace / back / goTab / resetTo` and handles the Android hardware back button.
  - **This app does not use Expo Router**, even though `AGENTS.md` says to. This was a deliberate call for a single-flow demo with shared state.
  - Only the top screen is mounted, so screens remount on return. The cleanup animation relies on that.
- `src/state.tsx` (`useSave`): all app state.
  - Each suggestion has a decision: `pending | accepted | kept`.
  - `qty` holds the chosen quantity for reduce-type suggestions.
  - `cleaned` marks plan rows whose cleanup animation already ran.
  - `basketReady` tracks the prepared shopping basket.
  - `expensesOpen` is whether the "Arvioidut menot" dropdown on the Säästä tab is open (closed by default). It lives here so it survives the tab remounting.
  - `planForGoal(goal, ids)` is the outcome-first "AI": fewest changes first, then the smallest overshoot, by brute force over subsets. It is currently unused: the +20 / +35 / +50 € goal chips were removed from the Säästä tab. `Review` and `OutcomeBars` still accept a `goal` prop.
- `src/data.ts`: all demo data.
  - `PLAN` is the spending forecast. `BASELINE` = balance − plan total, which comes to 64 €.
  - `SUGGESTIONS` come in four kinds: `remove | pause | swap | reduce`. Each has tap-only Q&A.
  - Also here: `TRANSACTIONS` and `SHOPPING_BASE`.
  - The numbers are tuned so that all defaults give 64 € → 122 € (+58 €), matching the mockups. Re-check that if you edit amounts.
- `src/components/`
  - `OutcomeBars`: the single outcome visualisation.
  - `PlanRow`: the cleanup and flash animations.
  - `ui.tsx`: `T`, `Press`, `Btn`, `Cta` (the big green call-to-action), `Header`, `Body`, `Card`, `Pill`, `AnimatedNumber`, and the haptics helpers.
  - `Icon`: SVG icons traced from the mockups.
  - `TabBar`.
- `src/screens/`: `Home`, `Save` (the hub), `Review` (suggestion cards; after the last card it goes straight back to `Save`, with no summary screen), `Shopping` (currently unreachable: every "Katso kauppalista" entry point was removed for now), `Detail`, `Ask`, `Account`, `Other` (S-Etukortti and Minä, with the "Nollaa demo" reset).

## Product rules (from the brief)

- **No chatbot.** "Kysy tästä" is tap-only canned Q&A. Don't add a free-text input unless asked.
- **One simple outcome visualisation**: a single bar that updates immediately. It starts at the no-changes estimate (green), then accepted changes grow on its end (solid yellow) and the suggestion being looked at shows as a dashed segment. The big number is baseline + accepted; the dashed preview is never part of the number. It is a dashed legend entry under the bar: "Mahdollista +X €" on the Säästä tab, "Jos hyväksyt +X €" on the Review cards. On both, the legend entries are stacked one per row (Ilman säästöjä, Säästösi, then the dashed one). The Säästä tab's hero is centered: "Arvioitu saldo" as the block's title (large, dark), "Palkkapäivänä {date}" under it, then the big number.
- **Completed transactions never change.** Only the forecast (`PLAN`) changes.
- **Users can protect purchases.** "Hylkää" on a suggestion card sets the decision to `kept` and shows a lock tag.
- **A cancelled change is never suggested again.** "Peru tämä säästö" on `Detail` sets the decision to `kept`, not back to `pending`.
- **The forecast is an estimate from past spending.** Say so wherever forecast numbers appear ("arvio", "Arvioidut menot", the "Ennuste aiemmista ostoistasi" note on the Säästä tab).
- **The Säästä tab has no title bar.** Its top is a white hero (outcome bar, CTA) flush with the white status-bar area.
- **Suggestion cards never scroll.** `Review` is a fixed layout that must fit one screen, and the tab bar is hidden on it (see `Shell` in `App.tsx`). Check it at 390×844 and on a small screen after any copy or layout change.
- **The Koti card only invites.** It shows only while suggestions are pending; with none left it disappears.
- **Accepted changes lead somewhere useful:** cancellation steps for subscriptions. (The shopping list and prepared basket are hidden for now.)

## Gotchas

- **Fonts:** Figtree has one font family per weight. Use `font(weight, size, color)` or `<T w={700}>`, never `fontWeight`.
- **`Press`:** its `style` applies to the inner animated view. For layout on the touch target (e.g. `flex: 1` in a row), pass `containerStyle`.
- **Dashed bar segment:** drawn as one fully rounded dashed rect *behind* the solid bars, because iOS can't render dashed borders on partial sides. Bar widths are animated in pixels after `onLayout`; `Animated.add` with plain numbers isn't used.
- **ScrollView ref type:** in RN 0.88, use `import type { ScrollViewInstance } from 'react-native'` for ScrollView refs.
- **Plan total on the Säästä tab:** it subtracts a change only once its row is `cleaned`, so the total ticks down in sync with the animation. While the "Arvioidut menot" dropdown is closed the rows aren't mounted, so `Save` marks pending rows `cleaned` straight away; the animation only plays when the list is open.
- **Android tab bar inset:** Expo Go on Android can report a bottom safe-area inset that's too small, so the edge-to-edge navigation bar covers the tab bar. `TabBar` sets a 48 dp minimum bottom padding on Android. Don't drop it back to the plain inset.
- **Web is only for checking:** `useNativeDriver` warnings there are expected. Haptics only work on a real device.
- **UI checks:** export the web build (`npx expo export --platform web --output-dir <dir>`), serve it, and drive it with Playwright at 390×844. Write the output to a scratch dir, never inside the project. On Windows, stop the static server before re-exporting into the same dir, or the export fails with EBUSY.
