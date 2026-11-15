import { Slot } from 'expo-router';

/**
 * Expo Router is only a thin host here: it serves the one screen below and the
 * server-side API route in `api/chat+api.ts` (which keeps the Gemini key off the
 * client). All in-app navigation still goes through `src/nav.tsx`.
 */
export default function RootLayout() {
  return <Slot />;
}
