import React, { createContext, useContext, useMemo, useState } from 'react';
import { Lang, setCurrentLang } from './lang';
import { STRINGS, Strings } from './strings';

export type { Lang } from './lang';
export { LANGS, pick } from './lang';

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: Strings };

const LangContext = createContext<Ctx | null>(null);

/** Web only: remember the language across reloads. Native has no storage module in this demo, so it starts in Finnish. */
const storage = (): Storage | undefined => {
  try {
    return (globalThis as { localStorage?: Storage }).localStorage;
  } catch {
    return undefined;
  }
};
const KEY = 's-mobiili-demo.lang';

function initialLang(): Lang {
  try {
    const v = storage()?.getItem(KEY);
    return v === 'en' || v === 'fi' ? v : 'fi';
  } catch {
    return 'fi';
  }
}

/**
 * Holds the UI language. Wrap it around everything that shows text
 * (SaveProvider included: the demo data is built per language).
 */
export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang);
  // Keep the non-React copy in sync before children render, so eur() etc. format for this language.
  setCurrentLang(lang);
  const value = useMemo<Ctx>(
    () => ({
      lang,
      t: STRINGS[lang],
      setLang: (l) => {
        setCurrentLang(l);
        setLangState(l);
        try {
          storage()?.setItem(KEY, l);
        } catch {
          // Storage blocked: the choice just won't survive a reload.
        }
      },
    }),
    [lang],
  );
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('useLang outside LangProvider');
  return ctx;
}

/** Shorthand for the UI strings. */
export const useT = () => useLang().t;
