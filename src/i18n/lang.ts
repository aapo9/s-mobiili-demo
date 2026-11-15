/**
 * The active UI language, outside React.
 *
 * Plain helpers like `eur()` in theme.ts read it, so they don't need a hook.
 * `LangProvider` (i18n/index.tsx) keeps it in sync and re-renders the app when
 * it changes. Components should use `useLang()` instead of reading this.
 */
export type Lang = 'fi' | 'en';

export const LANGS: { id: Lang; name: string }[] = [
  { id: 'fi', name: 'Suomi' },
  { id: 'en', name: 'English' },
];

let current: Lang = 'fi';

export const getLang = (): Lang => current;
export const setCurrentLang = (l: Lang) => {
  current = l;
};

/** Pick the text for a language: `pick(lang, 'Hei', 'Hi')`. */
export const pick = <T,>(lang: Lang, fi: T, en: T): T => (lang === 'fi' ? fi : en);
